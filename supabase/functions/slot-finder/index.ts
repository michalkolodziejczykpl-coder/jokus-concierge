// Edge Function: slot finder.
// Given (module_id, address, preferred_time) returns 3-5 nearest available slots
// across jokusors that serve the address. Respects working hours + existing bookings.
// EXCLUDE USING gist on time_slots guarantees no overlap at DB level.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  // TODO: implement
  return new Response(JSON.stringify({ todo: 'slot-finder' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
