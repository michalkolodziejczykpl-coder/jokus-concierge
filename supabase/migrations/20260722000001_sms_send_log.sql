-- SMS send log + daily budget backing table (owner decision 2026-07-22).
--
-- Motivation: before the pilot there is NO counter of SMSAPI usage — the
-- first sign of an exhausted SMSAPI balance would be a resident not receiving
-- their OTP. The send-sms edge function will now:
--   * COUNT today's sends here before calling SMSAPI and hard-refuse above
--     the daily budgets (global + per phone number),
--   * INSERT one row per attempt (sent / rejected_* / smsapi_error),
-- and the admin panel shows today's + this month's usage.
--
-- Inserts happen ONLY via the edge function's service role — deliberately no
-- INSERT/UPDATE/DELETE policies. Admin reads via RLS.
--
-- NOT applied automatically. Owner applies manually via the Supabase SQL
-- Editor (repo convention), then regenerates src/lib/types/database.ts.

BEGIN;

CREATE TABLE sms_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Digits as sent to SMSAPI (E.164 without '+', e.g. 48695820031).
  phone text NOT NULL,
  -- 'alert_sent' = the owner-notification SMS (80% / 100% of budget); it does
  -- NOT count against the budget (budget queries filter status='sent').
  status text NOT NULL CHECK (
    status IN (
      'sent',
      'rejected_global_budget',
      'rejected_phone_limit',
      'smsapi_error',
      'alert_sent'
    )
  ),
  -- Which budget threshold an 'alert_sent' row announces (80 or 100). The
  -- (sent_on, alert_threshold) pair is the dedup key: each threshold fires
  -- AT MOST ONCE per Warsaw day, no matter how many sends cross it.
  alert_threshold integer CHECK (alert_threshold IS NULL OR alert_threshold IN (80, 100)),
  smsapi_error_code integer,
  -- Warsaw-local day the attempt belongs to (budget bucket).
  sent_on date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sms_log_day ON sms_send_log(sent_on, status);
CREATE INDEX idx_sms_log_phone_day ON sms_send_log(phone, sent_on);

-- DB-guaranteed alert dedup: at most ONE alert row per (day, threshold).
-- The edge function INSERTs the alert row BEFORE sending ("claim"); with two
-- concurrent invocations both passing the code-side check, the second INSERT
-- dies on this index (23505) and that caller skips the SMS.
CREATE UNIQUE INDEX idx_sms_log_alert_once_per_day
  ON sms_send_log(sent_on, alert_threshold)
  WHERE status = 'alert_sent';

ALTER TABLE sms_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_log_admin_read" ON sms_send_log
  FOR SELECT USING (is_admin());

COMMIT;

-- ===========================================================================
-- VERIFICATION — the SQL Editor shows this result; send it back.
-- ===========================================================================

SELECT 'sms_send_log exists' AS check_name,
       (SELECT count(*)::text FROM sms_send_log) AS actual,
       '0 (empty table)' AS expected
UNION ALL
SELECT 'RLS enabled',
       (SELECT relrowsecurity::text FROM pg_class WHERE relname = 'sms_send_log'),
       'true';
