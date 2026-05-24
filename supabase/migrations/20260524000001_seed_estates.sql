-- Seed: 5 osiedli Wrocławia jako bootstrap dla Fazy 1.
--
-- Wybrane rejony pokrywają orientacyjnie cały rynek pilotażowy. Polygon
-- (`boundary`) celowo NULL — dokładne granice z Wrocławskiego SIP wgramy w
-- osobnej migracji, gdy będziemy mieli adres → osiedle przez ST_Contains.
-- Tymczasem mieszkaniec ręcznie wybiera osiedle w onboardingu, a przypisanie
-- do jokusora opiera się na `postal_codes` overlap (heurystyka MVP).
--
-- Kody pocztowe to podzbiór typowych PCs dla każdego rejonu — wystarczający
-- żeby kilku testowych jokusorów mogło zadeklarować obsługę.

-- UNIQUE constraint robi seed idempotentnym (można re-runować, nie zduplikuje
-- osiedli). Sensowny constraint domenowy — dwa "Krzyki" w tym samym mieście
-- nie powinny istnieć.
ALTER TABLE public.estates
  ADD CONSTRAINT estates_name_city_unique UNIQUE (name, city);

INSERT INTO public.estates (name, city, voivodeship, postal_codes, is_active, launched_at)
VALUES
  ('Stare Miasto', 'Wrocław', 'Dolnośląskie',
   ARRAY['50-077', '50-078', '50-079', '50-085', '50-088', '50-101', '50-102'],
   true, now()),

  ('Śródmieście', 'Wrocław', 'Dolnośląskie',
   ARRAY['50-225', '50-226', '50-227', '50-228', '50-229', '50-345', '50-372'],
   true, now()),

  ('Krzyki', 'Wrocław', 'Dolnośląskie',
   ARRAY['50-505', '50-506', '50-507', '53-022', '53-023', '53-203', '53-505'],
   true, now()),

  ('Fabryczna', 'Wrocław', 'Dolnośląskie',
   ARRAY['51-100', '52-300', '54-066', '54-067', '54-130', '54-203', '54-426'],
   true, now()),

  ('Psie Pole', 'Wrocław', 'Dolnośląskie',
   ARRAY['51-505', '51-506', '52-014', '52-015', '52-016', '51-180', '51-411'],
   true, now())

ON CONFLICT (name, city) DO NOTHING;
