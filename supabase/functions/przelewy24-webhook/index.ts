// Edge Function: Przelewy24 payment webhook.
// Verifies signature, finds the order by idempotency_key, transitions:
//   slot hold → confirmed, payment.status → captured,
//   notifies jokusor that an order is incoming.
// Be sure to verify the CRC signature with PRZELEWY24_CRC before trusting the payload.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  // TODO: implement
  return new Response(JSON.stringify({ todo: 'przelewy24-webhook' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
