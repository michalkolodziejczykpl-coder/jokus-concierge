// Gate for MOCK payments (orders + tips) until real Przelewy24 (sprint 3c).
// Review must-fix #5: without a real payment provider, any logged-in user could
// mark their order/tip as "paid" with no money moving. While
// MOCK_PAYMENT_ALLOWLIST is set (comma-separated emails), only those addresses
// may mock-pay — closing the public hole while keeping test accounts working.
// When the env is unset/empty we fail closed in production (deny everyone, so a
// missing Vercel env can never reopen the public hole) but stay open outside
// production (so local dev + pre-allowlist testing don't break).

/**
 * TYMCZASOWE na czas weryfikacji P24 (owner decision 2026-07-22): every
 * signed-in user may mock-pay. The allowlist gate kept rejecting the P24 test
 * account on production for a still-undiagnosed reason, and the verification
 * blocks the pilot; risk accepted by the owner (no production traffic,
 * payments are mock anyway, the route still requires a session).
 *
 * REMOVE together with MOCK_PAYMENT_ALLOWLIST after the P24 verification —
 * restore by delegating to strictMockPaymentGate below (see the cleanup
 * checklist in CLAUDE.md).
 */
export function isMockPaymentAllowed(email: string | null | undefined): boolean {
  void email;
  return true;
}

/**
 * The real allowlist gate — the pre-bypass behavior, kept intact so the
 * cleanup is a one-line change back to `return strictMockPaymentGate(email)`.
 * Denials log diagnostics WITHOUT leaking values (entry LENGTHS expose the
 * classic paste-with-quotes mistake: clean e-mail 19 chars, quoted 21).
 */
export function strictMockPaymentGate(email: string | null | undefined): boolean {
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
    console.error('[mockGate] denied', {
      entries: allow.length,
      entryLengths: allow.map((e) => e.length),
      emailLength: email.length,
      emailDomain: email.split('@')[1] ?? null
    });
  }
  return allowed;
}
