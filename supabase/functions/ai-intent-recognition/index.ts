// Edge Function: AI intent recognition.
// Pipeline: Whisper-transcribed text → embedding → pgvector nearest neighbour → intent.
// Returns { intent_key, confidence, parameters } or { fallback: true, suggestions: [...] }
// when confidence < AI_INTENT_CONFIDENCE_THRESHOLD (0.75).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  // TODO: implement
  return new Response(JSON.stringify({ todo: 'ai-intent-recognition' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
