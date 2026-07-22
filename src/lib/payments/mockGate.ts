// Gate for MOCK payments (orders + tips) until real Przelewy24 (sprint 3c).
// Review must-fix #5: without a real payment provider, any logged-in user could
// mark their order/tip as "paid" with no money moving. While
// MOCK_PAYMENT_ALLOWLIST is set (comma-separated emails), only those addresses
// may mock-pay — closing the public hole while keeping test accounts working.
// When the env is unset/empty we fail closed in production (deny everyone, so a
// missing Vercel env can never reopen the public hole) but stay open outside
// production (so local dev + pre-allowlist testing don't break).

export function isMockPaymentAllowed(email: string | null | undefined): boolean {
  const raw = process.env.MOCK_PAYMENT_ALLOWLIST;
  if (!raw || !raw.trim()) {
    // Not configured → fail closed in production, open elsewhere.
    if (process.env.NODE_ENV === 'production') {
      console.error('[mockGate] denied: MOCK_PAYMENT_ALLOWLIST unset/empty at runtime');
      return false;
    }
    return true;
  }
  if (!email) {
    console.error('[mockGate] denied: session has no email');
    return false;
  }
  const allow = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allowed = allow.includes(email.toLowerCase());
  if (!allowed) {
    // Permanent diagnostics WITHOUT leaking values (lesson of 2026-07-22:
    // a bare 403 hid the cause three times today). Entry LENGTHS expose the
    // classic paste-with-quotes mistake ("jokustest@gmail.com" = 21 chars,
    // clean value = 19) without printing anyone's address.
    console.error('[mockGate] denied', {
      entries: allow.length,
      entryLengths: allow.map((e) => e.length),
      emailLength: email.length,
      emailDomain: email.split('@')[1] ?? null
    });
  }
  return allowed;
}
