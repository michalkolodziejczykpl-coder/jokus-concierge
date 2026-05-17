// Edge Function: tracking broadcast.
// Receives throttled GPS updates from jokusor and rebroadcasts on the
// Realtime channel `tracking:order:{id}`. Persists only checkpoint events
// (accepted, started, arrived_pickup, etc.) to order_events — never raw GPS.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  // TODO: implement
  return new Response(JSON.stringify({ todo: 'tracking-broadcast' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
