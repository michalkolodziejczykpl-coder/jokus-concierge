// Gate for MOCK payments (orders + tips) until real Przelewy24 (sprint 3c).
// Review must-fix #5: without a real payment provider, any logged-in user could
// mark their order/tip as "paid" with no money moving. While
// MOCK_PAYMENT_ALLOWLIST is set (comma-separated emails), only those addresses
// may mock-pay — closing the public hole while keeping test accounts working.
// When the env is unset/empty we stay open (so local dev + pre-allowlist testing
// don't break). Set the env in Vercel to enforce it.

export function isMockPaymentAllowed(email: string | null | undefined): boolean {
  const raw = process.env.MOCK_PAYMENT_ALLOWLIST;
  if (!raw || !raw.trim()) return true; // not configured → open
  if (!email) return false;
  const allow = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
