-- ============================================================================
-- MIGMIG Concierge — Schema PostgreSQL (Supabase)
-- Version: 1.0
-- ============================================================================
-- WYMAGANIA:
--   1. PostgreSQL 15+
--   2. Extensions:
--      - uuid-ossp (gen_random_uuid)
--      - btree_gist (EXCLUDE constraint dla slotów)
--      - postgis (geografia: polygony osiedli, punkty)
--      - pgvector (embeddings AI)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('resident', 'jokusor', 'admin');

CREATE TYPE module_category AS ENUM (
  'delivery', 'shopping', 'transport', 'home_pet',
  'errands', 'professional', 'marketplace'
);

CREATE TYPE price_unit AS ENUM ('fixed', 'hourly', 'per_km', 'percent');

CREATE TYPE order_status AS ENUM (
  'draft',       -- mieszkaniec wypełnia formularz
  'hold',        -- slot zarezerwowany, czeka na płatność (90s)
  'pending',     -- opłacone, czeka na akceptację jokusora (5 min)
  'accepted',    -- jokusor zaakceptował, jeszcze nie rozpoczął
  'in_transit',  -- jokusor w drodze
  'at_pickup',   -- jokusor w punkcie odbioru (sklep itp.)
  'in_progress', -- realizacja zlecenia
  'in_return',   -- droga powrotna (np. po zakupach)
  'completed',   -- zakończone
  'cancelled',   -- anulowane
  'disputed'     -- reklamacja
);

CREATE TYPE billing_model AS ENUM (
  'subscription_only',  -- tylko abonament
  'commission_only',    -- tylko prowizja
  'hybrid'              -- abonament + prowizja
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'
);

CREATE TYPE listing_status AS ENUM (
  'active', 'reserved', 'sold', 'archived', 'removed'
);

CREATE TYPE listing_condition AS ENUM (
  'new', 'like_new', 'good', 'used', 'for_parts'
);

CREATE TYPE proposal_status AS ENUM (
  'pending', 'under_review', 'approved', 'rejected', 'implemented'
);

-- ============================================================================
-- TABELE: użytkownicy i osiedla
-- ============================================================================

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'resident',
  age_verified boolean NOT NULL DEFAULT false,
  -- dla weryfikacji 18+ przy zakupach alkoholu/tytoniu
  oauth_provider text, -- 'google' | 'facebook' | 'apple' | 'email'
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz -- soft delete (RODO grace period)
);

CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Osiedla obsługiwane przez MIGMIG (definicja geograficzna)
CREATE TABLE estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- 'Krzyki', 'Stare Miasto'
  city text NOT NULL,                    -- 'Wrocław'
  voivodeship text NOT NULL,             -- 'Dolnośląskie'
  boundary geography(POLYGON, 4326),     -- polygon na mapie
  postal_codes text[],                   -- pomocniczo: kody pocztowe
  is_active boolean NOT NULL DEFAULT true,
  launched_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_estates_boundary ON estates USING gist(boundary);
CREATE INDEX idx_estates_active ON estates(is_active);

-- Adresy mieszkańców (wielokrotne — dom, biuro, dom rodziców)
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Dom',
  street text NOT NULL,
  building text NOT NULL,
  apartment text,
  city text NOT NULL,
  postal_code text NOT NULL,
  point geography(POINT, 4326),
  estate_id uuid REFERENCES estates(id),
  is_default boolean NOT NULL DEFAULT false,
  notes text, -- np. "klucze u sąsiada w mieszkaniu 4B"
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_estate ON addresses(estate_id);
CREATE INDEX idx_addresses_point ON addresses USING gist(point);

-- Tylko jeden domyślny adres per user
CREATE UNIQUE INDEX idx_addresses_one_default ON addresses(user_id) WHERE is_default;

-- Profile jokusorów (rozszerzenie users)
CREATE TABLE jokusors (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  estate_id uuid NOT NULL REFERENCES estates(id),
  service_area geography(POLYGON, 4326),
  -- własny zasięg jokusora (może być węższy niż osiedle)
  service_postal_codes text[],
  -- alternatywa do polygonu: lista kodów pocztowych
  service_streets text[],
  -- alternatywa: lista konkretnych ulic
  bio text,
  business_name text,
  nip text,
  regon text,
  bank_account text,
  rating numeric(3,2) DEFAULT 0,
  completed_jobs_count integer NOT NULL DEFAULT 0,
  billing_model billing_model NOT NULL DEFAULT 'hybrid',
  subscription_amount numeric(10,2),
  commission_rate numeric(5,4),
  -- dni pracy: array dla dni tygodnia (0=ndz, 6=sob)
  working_hours jsonb DEFAULT '{
    "0": null,
    "1": {"from": "08:00", "to": "20:00"},
    "2": {"from": "08:00", "to": "20:00"},
    "3": {"from": "08:00", "to": "20:00"},
    "4": {"from": "08:00", "to": "20:00"},
    "5": {"from": "08:00", "to": "20:00"},
    "6": {"from": "09:00", "to": "15:00"}
  }',
  max_concurrent_orders integer NOT NULL DEFAULT 1,
  vacation_until date,
  insurance_oc_amount numeric(12,2),
  insurance_valid_until date,
  background_check_url text,
  -- skan zaświadczenia o niekaralności
  contract_signed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  onboarding_status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'documents_review' | 'approved' | 'rejected'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_jokusors_estate ON jokusors(estate_id) WHERE is_active;
CREATE INDEX idx_jokusors_service_area ON jokusors USING gist(service_area);
CREATE INDEX idx_jokusors_rating ON jokusors(rating DESC) WHERE is_active;

-- ============================================================================
-- TABELE: moduły usług
-- ============================================================================

CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category module_category NOT NULL,
  icon_name text,
  base_price numeric(10,2) NOT NULL,
  price_unit price_unit NOT NULL DEFAULT 'fixed',
  estimated_duration_min integer NOT NULL,
  requires_pickup boolean NOT NULL DEFAULT false,
  requires_age_verification boolean NOT NULL DEFAULT false,
  custom_fields jsonb NOT NULL DEFAULT '[]',
  is_global boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_modules_category ON modules(category);
CREATE INDEX idx_modules_global ON modules(is_global, sort_order);

-- Per-osiedle: które moduły aktywne
CREATE TABLE module_activations (
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  estate_id uuid REFERENCES estates(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  price_override numeric(10,2),
  activated_at timestamptz DEFAULT now(),
  activated_by uuid REFERENCES users(id),
  PRIMARY KEY (module_id, estate_id)
);

CREATE INDEX idx_activations_estate_active ON module_activations(estate_id) WHERE active;

-- Per-jokusor: które moduły akceptuje
CREATE TABLE jokusor_modules (
  jokusor_id uuid REFERENCES jokusors(user_id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  accepts boolean NOT NULL DEFAULT true,
  custom_price numeric(10,2),
  PRIMARY KEY (jokusor_id, module_id)
);

-- ============================================================================
-- TABELE: zamówienia i sloty
-- ============================================================================

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES users(id),
  jokusor_id uuid REFERENCES jokusors(user_id),
  module_id uuid NOT NULL REFERENCES modules(id),
  estate_id uuid NOT NULL REFERENCES estates(id),
  address_id uuid NOT NULL REFERENCES addresses(id),
  pickup_address jsonb, -- dla zleceń wymagających pickup
  status order_status NOT NULL DEFAULT 'draft',
  base_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  custom_data jsonb DEFAULT '{}',
  -- wypełnienie custom_fields modułu
  notes text,
  bodycam_enabled boolean DEFAULT false,
  scheduled_at timestamptz,
  estimated_duration_min integer,
  planned_route jsonb,
  -- GeoJSON LineString trasy
  planned_duration_sec integer,
  created_via text DEFAULT 'tile',
  -- 'tile' | 'voice' | 'marketplace' | 'admin'
  voice_transcription text,
  voice_intent text,
  voice_confidence numeric(3,2),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);

CREATE INDEX idx_orders_resident ON orders(resident_id, created_at DESC);
CREATE INDEX idx_orders_jokusor ON orders(jokusor_id, scheduled_at) WHERE jokusor_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status, scheduled_at);
CREATE INDEX idx_orders_estate_status ON orders(estate_id, status);

-- Sloty czasowe — TUTAJ JEST NAJWAŻNIEJSZY CONSTRAINT
CREATE TABLE time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jokusor_id uuid NOT NULL REFERENCES jokusors(user_id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  range tstzrange NOT NULL,
  status text NOT NULL DEFAULT 'hold',
  -- 'hold' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  hold_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),

  -- KRYTYCZNE: dwa sloty tego samego jokusora nie mogą się nakładać czasowo
  EXCLUDE USING gist (
    jokusor_id WITH =,
    range WITH &&
  ) WHERE (status IN ('hold', 'confirmed', 'in_progress'))
);

CREATE INDEX idx_slots_range ON time_slots USING gist(range);
CREATE INDEX idx_slots_jokusor_status ON time_slots(jokusor_id, status);

-- Zdarzenia (checkpoint events) — historia zlecenia
CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  -- 'created' | 'accepted' | 'started' | 'arrived_pickup' | 'pickup_complete'
  -- | 'arrived_destination' | 'completed' | 'cancelled' | 'disputed'
  location geography(POINT, 4326),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_order ON order_events(order_id, created_at);

-- ============================================================================
-- TABELE: oceny, napiwki, propozycje
-- ============================================================================

CREATE TABLE ratings (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES users(id),
  jokusor_id uuid NOT NULL REFERENCES jokusors(user_id),
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  is_visible boolean NOT NULL DEFAULT true,
  -- admin może ukryć przy reklamacji
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ratings_jokusor ON ratings(jokusor_id, created_at DESC) WHERE is_visible;

CREATE TABLE tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  resident_id uuid NOT NULL REFERENCES users(id),
  jokusor_id uuid NOT NULL REFERENCES jokusors(user_id),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tips_jokusor ON tips(jokusor_id, created_at DESC);

CREATE TABLE module_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_by uuid NOT NULL REFERENCES users(id),
  estate_id uuid REFERENCES estates(id),
  name text NOT NULL,
  description text NOT NULL,
  expected_frequency text,
  expected_price_range text,
  votes_count integer NOT NULL DEFAULT 1,
  status proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_proposals_status_votes ON module_proposals(status, votes_count DESC);

CREATE TABLE module_proposal_votes (
  proposal_id uuid REFERENCES module_proposals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (proposal_id, user_id)
);

-- ============================================================================
-- TABELE: AI (skończona pula odpowiedzi)
-- ============================================================================

CREATE TABLE ai_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  intent_key text NOT NULL,
  -- 'cena_30min', 'jak_dlugo_trwa', 'czy_robicie_X'
  sample_questions text[] NOT NULL,
  -- pięć-piętnaście wariantów pytania ludzkim językiem
  embedding vector(1536),
  -- embedding wyliczony z agregacji sample_questions
  canonical_response text NOT NULL,
  -- jedna kanoniczna odpowiedź AI
  follow_up_action text,
  -- 'open_order_form' | 'show_pricing' | 'redirect_to_support'
  action_params jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(module_id, intent_key)
);

CREATE INDEX idx_ai_intents_embedding ON ai_intents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_ai_intents_module ON ai_intents(module_id);

-- Log zapytań głosowych (do analizy i poprawy)
CREATE TABLE voice_query_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  transcription text NOT NULL,
  matched_intent_id uuid REFERENCES ai_intents(id),
  similarity_score numeric(5,4),
  resulted_in_order boolean DEFAULT false,
  user_satisfied boolean,
  -- mieszkaniec może oznaczyć "AI mnie zrozumiało"
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_voice_log_intent ON voice_query_log(matched_intent_id, created_at DESC);

-- ============================================================================
-- TABELE: marketplace C2C
-- ============================================================================

CREATE TABLE marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estate_id uuid NOT NULL REFERENCES estates(id),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  -- 'electronics' | 'clothing' | 'books' | 'home' | 'kids' | 'sports' | 'other'
  price numeric(10,2) NOT NULL CHECK (price >= 5 AND price <= 50000),
  currency text NOT NULL DEFAULT 'PLN',
  condition listing_condition NOT NULL,
  status listing_status NOT NULL DEFAULT 'active',
  photos text[] NOT NULL DEFAULT '{}',
  pickup_address jsonb NOT NULL,
  delivery_option text NOT NULL DEFAULT 'migmig_or_pickup',
  -- 'migmig_only' | 'pickup_only' | 'migmig_or_pickup'
  moderation_status text NOT NULL DEFAULT 'auto_approved',
  -- 'pending' | 'auto_approved' | 'manual_approved' | 'rejected'
  moderation_notes text,
  views_count integer NOT NULL DEFAULT 0,
  reports_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_listings_estate_status ON marketplace_listings(estate_id, status) WHERE status = 'active';
CREATE INDEX idx_listings_category ON marketplace_listings(category, status);
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_listings_expires ON marketplace_listings(expires_at) WHERE status = 'active';

CREATE TABLE marketplace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_listing_msgs_listing ON marketplace_messages(listing_id, created_at);
CREATE INDEX idx_listing_msgs_recipient_unread ON marketplace_messages(recipient_id) WHERE read_at IS NULL;

CREATE TABLE marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id),
  buyer_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  delivery_order_id uuid REFERENCES orders(id),
  item_price numeric(10,2) NOT NULL,
  delivery_price numeric(10,2),
  migmig_commission numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'paid_to_escrow' | 'released_to_seller' | 'refunded' | 'disputed'
  payment_method text,
  -- 'blik_escrow' | 'cash_on_delivery'
  inspection_deadline timestamptz,
  -- 15 min na sprawdzenie po dostawie
  buyer_confirmed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_purchases_buyer ON marketplace_purchases(buyer_id, created_at DESC);
CREATE INDEX idx_purchases_seller ON marketplace_purchases(seller_id, created_at DESC);

-- ============================================================================
-- TABELE: zaufani fachowcy (moduł professional)
-- ============================================================================

CREATE TABLE trusted_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  category text NOT NULL,
  service_areas uuid[] NOT NULL,
  phone text NOT NULL,
  email text,
  company_name text,
  nip text,
  hourly_rate numeric(10,2),
  callout_fee numeric(10,2) DEFAULT 0,
  rating numeric(3,2) DEFAULT 0,
  completed_jobs integer NOT NULL DEFAULT 0,
  verified boolean DEFAULT false,
  verification_documents jsonb,
  emergency_available boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes_admin text,
  commission_rate numeric(5,4) DEFAULT 0.10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_professionals_category_active ON trusted_professionals(category, is_active);

CREATE TABLE professional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES trusted_professionals(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  reviewer_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELE: płatności i rozliczenia
-- ============================================================================

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  marketplace_purchase_id uuid REFERENCES marketplace_purchases(id),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PLN',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method text,
  -- 'blik' | 'card' | 'transfer' | 'apple_pay' | 'google_pay'
  external_id text,
  -- ID transakcji u Przelewy24
  external_response jsonb,
  -- raw response z webhooka
  idempotency_key text UNIQUE,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CHECK (order_id IS NOT NULL OR marketplace_purchase_id IS NOT NULL)
);

CREATE INDEX idx_payments_order ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_payments_external ON payments(external_id) WHERE external_id IS NOT NULL;

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jokusor_id uuid NOT NULL REFERENCES jokusors(user_id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  subscription_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  vat_amount numeric(10,2) NOT NULL,
  invoice_number text UNIQUE,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft',
  -- 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELE: notyfikacje i logi
-- ============================================================================

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- FUNKCJE pomocnicze
-- ============================================================================

-- Sprawdza czy adres mieści się w obsługiwanym osiedlu
CREATE OR REPLACE FUNCTION find_estate_for_address(p_point geography)
RETURNS uuid AS $$
  SELECT id FROM estates
  WHERE is_active AND ST_Contains(boundary::geometry, p_point::geometry)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Sprawdza czy adres jest w zasięgu jokusora
CREATE OR REPLACE FUNCTION jokusor_serves_address(
  p_jokusor_id uuid,
  p_point geography,
  p_postal_code text
) RETURNS boolean AS $$
DECLARE
  j RECORD;
BEGIN
  SELECT * INTO j FROM jokusors WHERE user_id = p_jokusor_id AND is_active;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Najpierw sprawdź polygon
  IF j.service_area IS NOT NULL THEN
    RETURN ST_Contains(j.service_area::geometry, p_point::geometry);
  END IF;

  -- Fallback: kody pocztowe
  IF j.service_postal_codes IS NOT NULL AND array_length(j.service_postal_codes, 1) > 0 THEN
    RETURN p_postal_code = ANY(j.service_postal_codes);
  END IF;

  -- Fallback: cała strefa osiedla
  RETURN p_point && (SELECT boundary FROM estates WHERE id = j.estate_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Aktualizuje rating jokusora po nowej ocenie
CREATE OR REPLACE FUNCTION update_jokusor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jokusors
  SET rating = (
    SELECT ROUND(AVG(stars)::numeric, 2)
    FROM ratings
    WHERE jokusor_id = NEW.jokusor_id AND is_visible
  )
  WHERE user_id = NEW.jokusor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_jokusor_rating();

-- Inkrementuje licznik zleceń po completed
CREATE OR REPLACE FUNCTION increment_jokusor_jobs_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE jokusors
    SET completed_jobs_count = completed_jobs_count + 1
    WHERE user_id = NEW.jokusor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_jobs
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_jokusor_jobs_count();

-- Auto-update updated_at na każdy update
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_jokusors_updated_at BEFORE UPDATE ON jokusors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_professionals_updated_at BEFORE UPDATE ON trusted_professionals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- SEED: bazowe moduły usług
-- ============================================================================

INSERT INTO modules (slug, name, description, category, icon_name, base_price, price_unit, estimated_duration_min, requires_pickup, requires_age_verification, custom_fields, sort_order) VALUES
-- delivery
('package-pickup', 'Odbiór paczki', 'Odbiór paczki od kuriera (DPD, DHL, InPost, GLS, UPS) i dostarczenie pod drzwi.', 'delivery', 'Package', 8.00, 'fixed', 20, false, false, '[{"key":"tracking_number","label":"Numer śledzenia","type":"text","required":true},{"key":"pickup_location","label":"Skąd odebrać (paczkomat/punkt)","type":"text","required":true},{"key":"notes","label":"Uwagi","type":"text","required":false}]'::jsonb, 1),
('mail-pickup', 'Odbiór listu poleconego', 'Odbiór listu poleconego z poczty z pełnomocnictwem.', 'delivery', 'Mail', 2.00, 'fixed', 15, false, false, '[{"key":"mail_office","label":"Skąd","type":"select","required":true,"options":["Poczta Polska","Paczkomat pocztowy"]}]'::jsonb, 2),
-- shopping
('grocery-shopping', 'Zakupy spożywcze', 'Zakupy w wybranym sklepie i dostawa pod drzwi.', 'shopping', 'ShoppingCart', 15.00, 'fixed', 60, true, false, '[{"key":"shopping_list","label":"Lista zakupów","type":"text","required":true},{"key":"preferred_shop","label":"Preferowany sklep","type":"select","required":false,"options":["Biedronka","Lidl","Carrefour","Żabka","Inny"]},{"key":"max_amount","label":"Limit kwoty","type":"number","required":false}]'::jsonb, 10),
('pharmacy', 'Apteka', 'Wykup recepty lub zakup leków OTC.', 'shopping', 'Pill', 12.00, 'fixed', 30, true, false, '[{"key":"prescription_type","label":"Typ recepty","type":"select","required":true,"options":["e-recepta","Recepta papierowa","Bez recepty (OTC)"]},{"key":"e_prescription_code","label":"Kod e-recepty","type":"text","required":false},{"key":"medications","label":"Leki","type":"text","required":true}]'::jsonb, 11),
('tobacco-alcohol', 'Tytoń i alkohol', 'Zakup wyrobów tytoniowych i alkoholowych (wymagana weryfikacja wieku).', 'shopping', 'Wine', 10.00, 'fixed', 25, true, true, '[{"key":"products","label":"Produkty","type":"text","required":true}]'::jsonb, 12),
('document-scanning', 'Skanowanie dokumentów', 'Odbiór dokumentów, skan i odesłanie cyfrowe + zwrot oryginałów.', 'shopping', 'Scan', 8.00, 'fixed', 30, false, false, '[{"key":"pages_count","label":"Liczba stron","type":"number","required":true}]'::jsonb, 13),
-- transport
('car-to-service', 'Auto do serwisu', 'Odbiór samochodu, dostawa do warsztatu, odbiór po naprawie.', 'transport', 'Car', 40.00, 'fixed', 45, false, false, '[{"key":"car_make_model","label":"Marka i model","type":"text","required":true},{"key":"service_address","label":"Adres warsztatu","type":"text","required":true}]'::jsonb, 20),
('airport-transfer', 'Transfer na lotnisko', 'Przewóz na lotnisko z pomocą przy bagażach.', 'transport', 'Plane', 80.00, 'fixed', 90, false, false, '[{"key":"airport","label":"Lotnisko","type":"select","required":true,"options":["WRO Wrocław","KTW Katowice","POZ Poznań"]},{"key":"flight_time","label":"Godzina lotu","type":"text","required":true},{"key":"passengers_count","label":"Liczba osób","type":"number","required":true},{"key":"luggage_count","label":"Liczba walizek","type":"number","required":true}]'::jsonb, 21),
('medical-transport', 'Transport medyczny', 'Przewóz na wizytę lekarską z oczekiwaniem.', 'transport', 'Stethoscope', 50.00, 'fixed', 120, false, false, '[{"key":"appointment_address","label":"Adres przychodni","type":"text","required":true},{"key":"appointment_time","label":"Godzina wizyty","type":"text","required":true},{"key":"mobility_assistance_needed","label":"Pomoc z poruszaniem","type":"text","required":false}]'::jsonb, 22),
-- home_pet
('dog-walking', 'Wyprowadzanie psa', 'Spacer z psem 30 lub 60 minut.', 'home_pet', 'Dog', 25.00, 'fixed', 30, false, false, '[{"key":"dog_name","label":"Imię psa","type":"text","required":true},{"key":"dog_photo","label":"Zdjęcie","type":"photo","required":false},{"key":"walk_duration","label":"Długość spaceru","type":"select","required":true,"options":["30 minut","60 minut"]}]'::jsonb, 30),
('pet-care', 'Opieka nad zwierzęciem', 'Karmienie, podawanie wody, sprzątanie podczas nieobecności.', 'home_pet', 'PawPrint', 20.00, 'fixed', 20, false, false, '[{"key":"pet_type","label":"Zwierzę","type":"select","required":true,"options":["Kot","Pies","Ryby","Inne"]}]'::jsonb, 31),
('plant-watering', 'Podlewanie kwiatów', 'Wizyta w mieszkaniu i podlewanie roślin.', 'home_pet', 'Sprout', 15.00, 'fixed', 15, false, false, '[{"key":"plants_count","label":"Liczba roślin","type":"number","required":true}]'::jsonb, 32),
('vacation-bundle', 'Pakiet "Wyjeżdżam"', 'Tygodniowy pakiet: poczta + kwiaty + zwierzę + sprawdzenie mieszkania.', 'home_pet', 'Suitcase', 150.00, 'fixed', 30, false, false, '[{"key":"vacation_start","label":"Początek urlopu","type":"text","required":true},{"key":"vacation_end","label":"Koniec urlopu","type":"text","required":true}]'::jsonb, 33),
-- errands
('queue-standing', 'Stanie w kolejce', 'Jokusor stoi w kolejce, mieszkaniec dochodzi na koniec.', 'errands', 'Users', 30.00, 'hourly', 90, false, false, '[{"key":"location","label":"Miejsce","type":"select","required":true,"options":["Urząd Miasta","ZUS","Urząd Skarbowy","Biuro paszportowe","Inny"]},{"key":"arrival_time","label":"Kiedy ma być w kolejce","type":"text","required":true}]'::jsonb, 40),
-- professional
('plumber-supervision', 'Przypilnuj hydraulika', 'Jokusor jest w mieszkaniu podczas naprawy hydraulicznej.', 'professional', 'Wrench', 50.00, 'hourly', 120, false, false, '[{"key":"problem_description","label":"Opis problemu","type":"text","required":true},{"key":"problem_photos","label":"Zdjęcia","type":"photo","required":false},{"key":"urgency","label":"Pilność","type":"select","required":true,"options":["Awaria - dziś","W ciągu tygodnia","Planowo"]}]'::jsonb, 50),
('electrician-supervision', 'Przypilnuj elektryka', 'Jokusor pilnuje pracy elektryka.', 'professional', 'Zap', 50.00, 'hourly', 120, false, false, '[{"key":"problem_description","label":"Opis problemu","type":"text","required":true},{"key":"urgency","label":"Pilność","type":"select","required":true,"options":["Awaria - dziś","W ciągu tygodnia","Planowo"]}]'::jsonb, 51),
('locksmith-supervision', 'Przypilnuj ślusarza', 'Jokusor podczas pracy ślusarza (wymiana zamka, problem z kluczem).', 'professional', 'Key', 50.00, 'hourly', 60, false, false, '[{"key":"lock_problem","label":"Problem","type":"select","required":true,"options":["Zatrzask","Wyłamany klucz","Wymiana zamka","Inne"]}]'::jsonb, 52),
('handyman-supervision', 'Przypilnuj złotej rączki', 'Jokusor pilnuje uniwersalnego fachowca przy drobnych pracach.', 'professional', 'Hammer', 50.00, 'hourly', 90, false, false, '[{"key":"task_description","label":"Co trzeba zrobić","type":"text","required":true}]'::jsonb, 53),
('appliance-repair-supervision', 'Przypilnuj serwisanta AGD', 'Jokusor pilnuje naprawy sprzętu domowego.', 'professional', 'Refrigerator', 50.00, 'hourly', 90, false, false, '[{"key":"appliance","label":"Urządzenie","type":"select","required":true,"options":["Pralka","Lodówka","Zmywarka","Piekarnik","Inne"]},{"key":"brand","label":"Marka","type":"text","required":false}]'::jsonb, 54);

-- ============================================================================
-- KONIEC SCHEMATU
-- ============================================================================
