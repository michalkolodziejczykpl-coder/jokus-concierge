-- Fix duplicate "notes" field on package-pickup module.
-- The original seed (migration 01) put a notes/Uwagi field inside custom_fields,
-- but orders already have a top-level `notes` column. Result: form renders two
-- "Uwagi" inputs stacked. This removes the duplicate from custom_fields.
-- Idempotent: filters by slug; the new array no longer contains a "notes" key.

UPDATE public.modules
SET custom_fields = '[
  {"key":"tracking_number","label":"Numer śledzenia","type":"text","required":true},
  {"key":"pickup_location","label":"Skąd odebrać (paczkomat/punkt)","type":"text","required":true}
]'::jsonb
WHERE slug = 'package-pickup';
