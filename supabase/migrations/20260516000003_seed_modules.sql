-- Seed: 24 modułów usług w 7 kategoriach (z koncepcji v2, sekcja 3).
-- TODO: dopisać konkretne INSERT-y po finalizacji tabeli `modules` w 01_schema.sql.
-- Trzymamy ten plik osobno, żeby seed mógł być re-runowany po wyzerowaniu danych.

-- =====================================================
-- 3.1 Delivery
-- =====================================================
-- INSERT INTO public.modules (slug, name_pl, category, base_price_pln, ...) VALUES
--   ('parcel_pickup',        'Odbiór paczki',                'delivery',  8.00, ...),
--   ('registered_letter',    'Odbiór listu poleconego',      'delivery',  2.00, ...),
--   ('marketplace_delivery', 'Dostawa z marketplace',        'delivery',  5.00, ...);

-- =====================================================
-- 3.2 Shopping
-- =====================================================
-- ('groceries', 'Zakupy spożywcze', 'shopping', 15.00, ...),
-- ('pharmacy',  'Apteka',           'shopping', 12.00, ...),
-- ('tobacco_alcohol', 'Tytoń i alkohol', 'shopping', 10.00, ...),
-- ('document_scan',   'Skanowanie dokumentów', 'shopping', 8.00, ...);

-- =====================================================
-- 3.3 Transport
-- =====================================================
-- ('car_to_service',     'Auto do serwisu',     'transport', 40.00, ...),
-- ('airport_transfer',   'Transfer na lotnisko','transport', 80.00, ...),
-- ('medical_transport',  'Transport medyczny',  'transport', 50.00, ...);

-- =====================================================
-- 3.4 Home & pets
-- =====================================================
-- ('dog_walk',           'Wyprowadzanie psa',        'home', 25.00, ...),
-- ('pet_care_visit',     'Opieka nad zwierzęciem',   'home', 20.00, ...),
-- ('plant_watering',     'Podlewanie kwiatów',       'home', 15.00, ...),
-- ('away_package',       'Pakiet Wyjeżdżam',         'home', 150.00, ...);

-- =====================================================
-- 3.5 Sprawy urzędowe
-- =====================================================
-- ('queue_standing',     'Stanie w kolejce',         'civic', 30.00, ...);

-- =====================================================
-- 3.6 Professional (przypilnuj fachowca)
-- =====================================================
-- ('watch_plumber',      'Przypilnuj hydraulika',    'professional', 50.00, ...),
-- ('watch_electrician',  'Przypilnuj elektryka',     'professional', 50.00, ...),
-- ('watch_locksmith',    'Przypilnuj ślusarza',      'professional', 50.00, ...),
-- ('watch_handyman',     'Przypilnuj złotej rączki', 'professional', 50.00, ...),
-- ('watch_appliance',    'Przypilnuj serwisanta AGD','professional', 50.00, ...);

-- =====================================================
-- 3.7 Marketplace
-- =====================================================
-- ('marketplace_listing', 'Wystaw ogłoszenie',       'marketplace', 0.00, ...),
-- ('marketplace_buy',     'Kup z dostawą',           'marketplace', 0.00, ...);
