// Edge Function: Supabase Send SMS Hook → SMSAPI.pl
//
// Supabase Auth calls this endpoint (HTTP POST) whenever it needs to deliver a
// phone OTP (registration step 3 — see docs/CLAUDE_CODE_TASK_rejestracja.md).
// The app-side code (signInWithOtp / updateUser({ phone }) / verifyOtp) is
// unchanged; we only swap WHO sends the SMS. Here we forward the code to
// SMSAPI.pl's REST API.
//
// Security: the request is signed with Standard Webhooks. We verify the
// signature with SEND_SMS_HOOK_SECRET before trusting the payload; a bad
// signature returns 401 and NO SMS is sent.
//
// DAILY SMS BUDGET (owner decision 2026-07-22): before calling SMSAPI we
// count today's (Europe/Warsaw) successful sends in public.sms_send_log and
// hard-refuse above the budgets — a runaway bot or a bug can never drain the
// SMSAPI balance silently. Every attempt is logged (sent / rejected_* /
// smsapi_error), which doubles as the usage counter the admin panel shows.
//
// OWNER ALERTS: crossing 80% of the global budget and hitting 100% each send
// ONE warning SMS to SMS_ALERT_PHONE — at most once per threshold per Warsaw
// day (dedup via an 'alert_sent' row keyed on sent_on + alert_threshold,
// inserted BEFORE the alert goes out so concurrent invocations can't
// double-send). Alert rows do not count against the budget.
//
// Limits are owner-tunable WITHOUT redeploy via function secrets:
//   SMS_DAILY_GLOBAL_LIMIT (default 100), SMS_DAILY_PHONE_LIMIT (default 5),
//   SMS_ALERT_PHONE (default 48695820031).
//
// If the log table is unreachable we fail OPEN (send the SMS, log to
// console): a DB blip must not lock every resident out of OTP — the budget
// protects money, not security.
//
// Deploy with --no-verify-jwt: the hook authenticates itself via the webhook
// signature, not a user JWT.
//
//   supabase functions deploy send-sms --no-verify-jwt
//
// Required function secrets (never commit): SMSAPI_TOKEN, SMSAPI_SENDER,
// SEND_SMS_HOOK_SECRET. See README.md.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

// Payload shape POSTed by the Send SMS Hook (confirmed against Supabase docs).
// For an email-first signup the user has no confirmed phone yet, so adding one
// is a PHONE CHANGE: the new number arrives in `phone_change`, not `phone`.
interface SendSmsPayload {
  user: { phone?: string; phone_change?: string; new_phone?: string };
  sms: { otp: string };
}

const SMSAPI_ENDPOINT = 'https://api.smsapi.pl/sms.do';
const DEFAULT_DAILY_GLOBAL_LIMIT = 100;
const DEFAULT_DAILY_PHONE_LIMIT = 5;
const DEFAULT_ALERT_PHONE = '48695820031'; // owner's number (see COMPANY.phone)

/** Warsaw-local calendar day (budget bucket), YYYY-MM-DD. */
function warsawToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' });
}

function restHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };
}

/** Exact 'sent' row count for today via PostgREST HEAD; null on failure. */
async function countSentToday(
  supabaseUrl: string,
  serviceKey: string,
  extraFilter: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/sms_send_log?select=id&sent_on=eq.${warsawToday()}&status=eq.sent${extraFilter}`,
      { method: 'HEAD', headers: { ...restHeaders(serviceKey), Prefer: 'count=exact' } }
    );
    const total = res.headers.get('content-range')?.split('/')[1];
    return total != null && total !== '*' ? Number(total) : null;
  } catch (err) {
    console.error('[send-sms] budget count failed', err);
    return null;
  }
}

async function logAttempt(
  supabaseUrl: string,
  serviceKey: string,
  row: {
    phone: string;
    status: string;
    alert_threshold?: number;
    smsapi_error_code?: number;
  }
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/sms_send_log`, {
      method: 'POST',
      headers: restHeaders(serviceKey),
      body: JSON.stringify({
        phone: row.phone,
        status: row.status,
        alert_threshold: row.alert_threshold ?? null,
        smsapi_error_code: row.smsapi_error_code ?? null,
        sent_on: warsawToday()
      })
    });
    return res.ok;
  } catch (err) {
    console.error('[send-sms] log insert failed', err);
    return false;
  }
}

/** Raw SMSAPI send. Returns the parsed JSON body (error field on failure). */
async function sendViaSmsApi(
  token: string,
  sender: string,
  toDigits: string,
  message: string
): Promise<{ error?: number; message?: string }> {
  const params = new URLSearchParams({
    to: toDigits,
    message,
    from: sender,
    format: 'json',
    encoding: 'utf-8'
  });
  const res = await fetch(SMSAPI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  return await res.json();
}

/**
 * Owner alert for a budget threshold — AT MOST once per threshold per Warsaw
 * day. The dedup row is inserted BEFORE the SMS goes out (claim-first), so
 * two concurrent invocations crossing the same threshold cannot both send.
 */
async function maybeSendThresholdAlert(opts: {
  supabaseUrl: string;
  serviceKey: string;
  threshold: 80 | 100;
  text: string;
  alertPhone: string;
  smsapiToken: string;
  smsapiSender: string;
}): Promise<void> {
  try {
    const dupRes = await fetch(
      `${opts.supabaseUrl}/rest/v1/sms_send_log?select=id&sent_on=eq.${warsawToday()}` +
        `&status=eq.alert_sent&alert_threshold=eq.${opts.threshold}&limit=1`,
      { headers: restHeaders(opts.serviceKey) }
    );
    const existing = (await dupRes.json()) as unknown[];
    if (existing.length > 0) return; // already alerted for this threshold today

    // Claim first, then send. The claim is DB-guaranteed unique per
    // (sent_on, alert_threshold) via idx_sms_log_alert_once_per_day — when two
    // concurrent invocations both pass the check above, the loser's INSERT
    // fails (23505), logAttempt returns false and that caller skips the SMS.
    const claimed = await logAttempt(opts.supabaseUrl, opts.serviceKey, {
      phone: opts.alertPhone,
      status: 'alert_sent',
      alert_threshold: opts.threshold
    });
    if (!claimed) return;

    const result = await sendViaSmsApi(
      opts.smsapiToken,
      opts.smsapiSender,
      opts.alertPhone,
      opts.text
    );
    if (result.error) {
      console.error('[send-sms] alert SMS failed', result.error, result.message);
    }
  } catch (err) {
    console.error('[send-sms] alert flow failed', err);
  }
}

Deno.serve(async (req) => {
  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  const smsapiToken = Deno.env.get('SMSAPI_TOKEN');
  const smsapiSender = Deno.env.get('SMSAPI_SENDER');

  if (!hookSecret || !smsapiToken || !smsapiSender) {
    console.error('[send-sms] missing env: SEND_SMS_HOOK_SECRET / SMSAPI_TOKEN / SMSAPI_SENDER');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const rawBody = await req.text();

  // 1. Verify the Standard Webhooks signature. The secret from the Supabase
  //    dashboard carries a `v1,whsec_` prefix that the library doesn't expect.
  let payload: SendSmsPayload;
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''));
    const headers = Object.fromEntries(req.headers);
    payload = wh.verify(rawBody, headers) as SendSmsPayload;
  } catch (err) {
    console.error('[send-sms] invalid webhook signature', err);
    return new Response(JSON.stringify({ error: 'invalid_signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Extract phone (E.164 +48...) and OTP. SMSAPI wants the number WITHOUT
  //    the leading '+', i.e. 48XXXXXXXXX. On a phone CHANGE (email-first signup
  //    adding a number) the value is in phone_change, not phone — fall back.
  const u = payload.user ?? {};
  const rawPhone = u.phone || u.phone_change || u.new_phone || '';
  const phone = rawPhone.replace(/[^\d]/g, '');
  const otp = payload.sms?.otp;
  if (!phone || !otp) {
    console.error(
      '[send-sms] payload missing phone or otp',
      JSON.stringify({ userKeys: Object.keys(u), hasOtp: Boolean(otp) })
    );
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Daily budget gate (fail-open when the log table is unreachable).
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const globalLimit = Number(Deno.env.get('SMS_DAILY_GLOBAL_LIMIT') ?? DEFAULT_DAILY_GLOBAL_LIMIT);
  const phoneLimit = Number(Deno.env.get('SMS_DAILY_PHONE_LIMIT') ?? DEFAULT_DAILY_PHONE_LIMIT);
  const alertPhone = (Deno.env.get('SMS_ALERT_PHONE') ?? DEFAULT_ALERT_PHONE).replace(/[^\d]/g, '');

  let sentTodayGlobal: number | null = null;

  if (supabaseUrl && serviceKey) {
    sentTodayGlobal = await countSentToday(supabaseUrl, serviceKey, '');

    if (sentTodayGlobal != null && sentTodayGlobal >= globalLimit) {
      await logAttempt(supabaseUrl, serviceKey, { phone, status: 'rejected_global_budget' });
      await maybeSendThresholdAlert({
        supabaseUrl,
        serviceKey,
        threshold: 100,
        text: `JOKUS: dzienny budzet SMS wyczerpany (${sentTodayGlobal}/${globalLimit}). Wysylka kodow OTP zablokowana do polnocy. Limit podniesiesz w Supabase: Edge Functions -> Secrets -> SMS_DAILY_GLOBAL_LIMIT.`,
        alertPhone,
        smsapiToken,
        smsapiSender
      });
      return new Response(JSON.stringify({ error: 'sms_daily_budget_exhausted' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sentTodayPhone = await countSentToday(supabaseUrl, serviceKey, `&phone=eq.${phone}`);
    if (sentTodayPhone != null && sentTodayPhone >= phoneLimit) {
      await logAttempt(supabaseUrl, serviceKey, { phone, status: 'rejected_phone_limit' });
      return new Response(JSON.stringify({ error: 'sms_phone_limit_exhausted' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    console.error('[send-sms] SUPABASE_URL / SERVICE_ROLE_KEY missing — budget gate skipped');
  }

  const message = `Twój kod JOKUS: ${otp}. Ważny 10 minut. Nie udostępniaj go nikomu.`;

  // 4. Send via SMSAPI.pl REST.
  let smsapiJson: { error?: number; message?: string };
  try {
    smsapiJson = await sendViaSmsApi(smsapiToken, smsapiSender, phone, message);
  } catch (err) {
    console.error('[send-sms] SMSAPI request failed', err);
    return new Response(JSON.stringify({ error: 'smsapi_unreachable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // SMSAPI signals failure with an `error` code in the JSON body (HTTP is still
  // 200 in that case), so check the body, not just res.ok.
  if (smsapiJson.error) {
    console.error('[send-sms] SMSAPI error', smsapiJson.error, smsapiJson.message);
    if (supabaseUrl && serviceKey) {
      await logAttempt(supabaseUrl, serviceKey, {
        phone,
        status: 'smsapi_error',
        smsapi_error_code: smsapiJson.error
      });
    }
    return new Response(
      JSON.stringify({
        error: 'smsapi_error',
        code: smsapiJson.error,
        message: smsapiJson.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. Log the send + 80% early warning (only when crossing INTO the band —
  //    the dedup row still guarantees at most one alert per day).
  if (supabaseUrl && serviceKey) {
    await logAttempt(supabaseUrl, serviceKey, { phone, status: 'sent' });
    const nowSent = (sentTodayGlobal ?? 0) + 1;
    const warnAt = Math.ceil(globalLimit * 0.8);
    if (nowSent >= warnAt && nowSent < globalLimit) {
      await maybeSendThresholdAlert({
        supabaseUrl,
        serviceKey,
        threshold: 80,
        text: `JOKUS: zuzyto ${nowSent}/${globalLimit} (>=80%) dziennego budzetu SMS. Limit podniesiesz w Supabase: Edge Functions -> Secrets -> SMS_DAILY_GLOBAL_LIMIT.`,
        alertPhone,
        smsapiToken,
        smsapiSender
      });
    }
  }

  // 6. Success — Supabase expects 200 with an (empty) JSON body.
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
