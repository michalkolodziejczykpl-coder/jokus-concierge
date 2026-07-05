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
    return process.env.NODE_ENV !== 'production';
  }
  if (!email) return false;
  const allow = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
