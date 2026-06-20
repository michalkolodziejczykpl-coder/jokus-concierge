-- Seed: additional service modules inspired by Taskrabbit / Handy / Fixly /
-- Dolly / Lalamove / Roadie / Instacart / Glovo / Wolt / Magic / Rappi.
-- Only services NOT already present are added. Idempotent: ON CONFLICT (slug)
-- DO NOTHING, so existing modules are untouched and re-running is safe.
-- Prices/durations are PLACEHOLDERS — edit later in /modules (admin).
-- custom_fields left empty ('[]') for now; refine per module in the admin panel.

insert into modules (
  slug, name, description, category, icon_name,
  base_price, price_unit, estimated_duration_min,
  requires_pickup, requires_age_verification, custom_fields, is_global, sort_order
) values
  -- professional: actual work (distinct from the existing "przypilnuj fachowca")
  ('furniture-assembly', 'Montaż mebli', 'Złożenie i ustawienie mebli (np. z IKEA) w Twoim domu.', 'professional', 'Sofa', 60.00, 'hourly', 90, false, false, '[]'::jsonb, true, 60),
  ('tv-mounting', 'Montaż TV na ścianie', 'Powieszenie telewizora na ścianie z uchwytem i ukryciem kabli.', 'professional', 'Tv', 80.00, 'fixed', 60, false, false, '[]'::jsonb, true, 61),
  ('shelf-picture-hanging', 'Wieszanie półek i obrazów', 'Zawieszenie półek, obrazów, luster i karniszy.', 'professional', 'Hammer', 40.00, 'hourly', 45, false, false, '[]'::jsonb, true, 62),
  ('painting', 'Malowanie', 'Malowanie ścian i drobne prace wykończeniowe.', 'professional', 'PaintRoller', 50.00, 'hourly', 180, false, false, '[]'::jsonb, true, 63),
  ('handyman-task', 'Złota rączka — drobne naprawy', 'Drobne naprawy i prace domowe wykonywane przez jokusora.', 'professional', 'Wrench', 50.00, 'hourly', 60, false, false, '[]'::jsonb, true, 64),
  ('smart-home-setup', 'Konfiguracja smart home', 'Instalacja i konfiguracja inteligentnych urządzeń domowych.', 'professional', 'Cpu', 60.00, 'hourly', 60, false, false, '[]'::jsonb, true, 65),

  -- home_pet: cleaning & home care
  ('home-cleaning', 'Sprzątanie', 'Sprzątanie mieszkania lub domu.', 'home_pet', 'Sparkles', 40.00, 'hourly', 120, false, false, '[]'::jsonb, true, 34),
  ('window-cleaning', 'Mycie okien', 'Mycie okien wewnątrz i na zewnątrz.', 'home_pet', 'Wind', 35.00, 'hourly', 60, false, false, '[]'::jsonb, true, 35),
  ('laundry-ironing', 'Pranie i prasowanie', 'Pranie, suszenie i prasowanie odzieży.', 'home_pet', 'Shirt', 30.00, 'hourly', 90, false, false, '[]'::jsonb, true, 36),
  ('gardening', 'Prace ogrodowe', 'Koszenie, pielęgnacja zieleni i drobne prace w ogrodzie.', 'home_pet', 'Shrub', 45.00, 'hourly', 120, false, false, '[]'::jsonb, true, 37),
  ('senior-help', 'Pomoc seniorom', 'Towarzyszenie i pomoc osobom starszym w codziennych sprawach.', 'home_pet', 'HeartHandshake', 35.00, 'hourly', 60, false, false, '[]'::jsonb, true, 38),

  -- transport: moving & big items
  ('moving-help', 'Pomoc przy przeprowadzce', 'Przenoszenie i transport mebli oraz rzeczy przy przeprowadzce.', 'transport', 'Truck', 90.00, 'hourly', 180, false, false, '[]'::jsonb, true, 23),
  ('furniture-pickup-carry', 'Odbiór i wniesienie mebla', 'Odbiór mebla lub dużego zakupu (IKEA, OLX) i wniesienie do mieszkania.', 'transport', 'Sofa', 70.00, 'fixed', 90, true, false, '[]'::jsonb, true, 24),
  ('junk-removal', 'Wywóz rzeczy', 'Odbiór i utylizacja niepotrzebnych rzeczy lub gabarytów.', 'transport', 'Trash2', 60.00, 'fixed', 60, true, false, '[]'::jsonb, true, 25),

  -- delivery: on-demand courier & pickups
  ('item-courier', 'Przewóz rzeczy na żądanie', 'Kurier na żądanie: mała paczka, duża paczka lub gabaryt.', 'delivery', 'Truck', 20.00, 'fixed', 30, true, false, '[]'::jsonb, true, 3),
  ('return-dropoff', 'Nadanie zwrotu lub paczki', 'Odbiór paczki/zwrotu i nadanie w punkcie kurierskim.', 'delivery', 'PackageCheck', 10.00, 'fixed', 30, true, false, '[]'::jsonb, true, 4),
  ('store-pickup', 'Odbiór ze sklepu', 'Odbiór zamówienia lub materiałów ze sklepu (np. market budowlany) i dostawa.', 'delivery', 'Store', 15.00, 'fixed', 45, true, false, '[]'::jsonb, true, 5),

  -- shopping: local store, food, flowers
  ('local-store-shopping', 'Zakupy z dowolnego sklepu', 'Wybierz sklep w okolicy — zrobimy zakupy i przywieziemy.', 'shopping', 'Store', 15.00, 'fixed', 60, true, false, '[]'::jsonb, true, 14),
  ('food-delivery', 'Jedzenie z restauracji', 'Odbiór jedzenia z wybranej restauracji i dostawa pod drzwi.', 'shopping', 'UtensilsCrossed', 12.00, 'fixed', 45, true, false, '[]'::jsonb, true, 15),
  ('flowers-gifts', 'Kwiaty i prezenty', 'Zakup i dostawa kwiatów lub prezentu.', 'shopping', 'Flower2', 15.00, 'fixed', 45, true, false, '[]'::jsonb, true, 16),

  -- errands: concierge "describe what you need" + wait service
  ('custom-task', 'Zleć zadanie jokusorowi', 'Opisz, czego potrzebujesz — jokusor zorganizuje i wykona zadanie.', 'errands', 'Wand2', 0.00, 'hourly', 60, false, false, '[]'::jsonb, true, 41),
  ('wait-service', 'Poczekaj / przypilnuj', 'Jokusor czeka na dostawę, serwisanta lub w wyznaczonym miejscu.', 'errands', 'Clock', 30.00, 'hourly', 60, false, false, '[]'::jsonb, true, 42)
on conflict (slug) do nothing;
