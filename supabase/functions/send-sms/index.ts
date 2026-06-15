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

  const message = `Twój kod JOKUS: ${otp}. Ważny 10 minut. Nie udostępniaj go nikomu.`;

  // 3. Send via SMSAPI.pl REST.
  const params = new URLSearchParams({
    to: phone,
    message,
    from: smsapiSender,
    format: 'json',
    encoding: 'utf-8'
  });

  let smsapiJson: { error?: number; message?: string; count?: number };
  try {
    const res = await fetch(SMSAPI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${smsapiToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    smsapiJson = await res.json();
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
    return new Response(
      JSON.stringify({ error: 'smsapi_error', code: smsapiJson.error, message: smsapiJson.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Success — Supabase expects 200 with an (empty) JSON body.
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
