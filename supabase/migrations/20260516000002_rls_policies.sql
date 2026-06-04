-- ============================================================================
-- JOKUS Concierge — Row Level Security policies
-- ============================================================================
-- Wszystkie tabele mają włączone RLS. Polityki dla trzech ról:
--   - resident: widzi/edytuje tylko swoje dane
--   - jokusor: widzi/edytuje swoje + zamówienia, które realizuje
--   - admin: widzi wszystko, edytuje większość
-- ============================================================================

-- Helper function: czy bieżący użytkownik jest adminem
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_jokusor() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'jokusor' AND deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_role_id() RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- TABELA: users
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_read_admin" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "users_read_public_profile" ON users
  FOR SELECT USING (role = 'jokusor' AND deleted_at IS NULL);
  -- jokusorzy mają publiczny profil (oceny, imię, avatar)

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = current_role_id());
  -- użytkownik nie może zmienić swojej roli

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (is_admin());

-- ============================================================================
-- TABELA: addresses
-- ============================================================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_owner_all" ON addresses
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "addresses_admin_read" ON addresses
  FOR SELECT USING (is_admin());

-- Jokusor widzi adres tylko jeśli ma aktywne zlecenie na ten adres
CREATE POLICY "addresses_jokusor_read_active" ON addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE address_id = addresses.id
        AND jokusor_id = auth.uid()
        AND status IN ('accepted', 'in_transit', 'at_pickup', 'in_progress', 'in_return')
    )
  );

-- ============================================================================
-- TABELA: estates
-- ============================================================================

ALTER TABLE estates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estates_read_all" ON estates
  FOR SELECT USING (is_active OR is_admin());

CREATE POLICY "estates_write_admin" ON estates
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELA: jokusors
-- ============================================================================

ALTER TABLE jokusors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jokusors_read_active" ON jokusors
  FOR SELECT USING (is_active);

CREATE POLICY "jokusors_read_own" ON jokusors
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "jokusors_read_admin" ON jokusors
  FOR SELECT USING (is_admin());

CREATE POLICY "jokusors_update_own" ON jokusors
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "jokusors_admin_all" ON jokusors
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELA: modules
-- ============================================================================

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_read_all" ON modules
  FOR SELECT USING (true);

CREATE POLICY "modules_write_admin" ON modules
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELE: module_activations, jokusor_modules
-- ============================================================================

ALTER TABLE module_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activations_read_all" ON module_activations
  FOR SELECT USING (true);

CREATE POLICY "activations_write_admin" ON module_activations
  FOR ALL USING (is_admin());

ALTER TABLE jokusor_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jokusor_modules_read_all" ON jokusor_modules
  FOR SELECT USING (true);

CREATE POLICY "jokusor_modules_update_own" ON jokusor_modules
  FOR UPDATE USING (jokusor_id = auth.uid());

CREATE POLICY "jokusor_modules_insert_own" ON jokusor_modules
  FOR INSERT WITH CHECK (jokusor_id = auth.uid());

CREATE POLICY "jokusor_modules_admin" ON jokusor_modules
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELA: orders
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_read_resident" ON orders
  FOR SELECT USING (resident_id = auth.uid());

CREATE POLICY "orders_read_jokusor" ON orders
  FOR SELECT USING (jokusor_id = auth.uid());

CREATE POLICY "orders_read_admin" ON orders
  FOR SELECT USING (is_admin());

CREATE POLICY "orders_insert_resident" ON orders
  FOR INSERT WITH CHECK (resident_id = auth.uid());

CREATE POLICY "orders_update_resident_draft" ON orders
  FOR UPDATE USING (
    resident_id = auth.uid() AND status IN ('draft', 'hold')
  );

CREATE POLICY "orders_update_jokusor" ON orders
  FOR UPDATE USING (jokusor_id = auth.uid())
  WITH CHECK (jokusor_id = auth.uid());

CREATE POLICY "orders_update_admin" ON orders
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELA: time_slots
-- ============================================================================

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slots_read_jokusor" ON time_slots
  FOR SELECT USING (jokusor_id = auth.uid());

CREATE POLICY "slots_read_order_resident" ON time_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE id = time_slots.order_id AND resident_id = auth.uid()
    )
  );

CREATE POLICY "slots_read_admin" ON time_slots
  FOR SELECT USING (is_admin());

CREATE POLICY "slots_insert_system" ON time_slots
  FOR INSERT WITH CHECK (true);
  -- inserty są zawsze przez Edge Function (slot-finder)

CREATE POLICY "slots_update_jokusor" ON time_slots
  FOR UPDATE USING (jokusor_id = auth.uid());

CREATE POLICY "slots_admin" ON time_slots
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELE: order_events
-- ============================================================================

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read_order_party" ON order_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_events.order_id
        AND (o.resident_id = auth.uid() OR o.jokusor_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "events_insert_jokusor" ON order_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_id AND jokusor_id = auth.uid()
    )
  );

-- ============================================================================
-- TABELE: ratings, tips
-- ============================================================================

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_read_all" ON ratings
  FOR SELECT USING (is_visible OR resident_id = auth.uid() OR jokusor_id = auth.uid() OR is_admin());

CREATE POLICY "ratings_insert_resident" ON ratings
  FOR INSERT WITH CHECK (
    resident_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders WHERE id = order_id
        AND resident_id = auth.uid()
        AND status = 'completed'
    )
  );

CREATE POLICY "ratings_admin" ON ratings
  FOR UPDATE USING (is_admin());

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_read_party" ON tips
  FOR SELECT USING (
    resident_id = auth.uid() OR jokusor_id = auth.uid() OR is_admin()
  );

CREATE POLICY "tips_insert_resident" ON tips
  FOR INSERT WITH CHECK (resident_id = auth.uid());

-- ============================================================================
-- TABELE: module_proposals
-- ============================================================================

ALTER TABLE module_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_read_all" ON module_proposals
  FOR SELECT USING (true);

CREATE POLICY "proposals_insert_authenticated" ON module_proposals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND proposed_by = auth.uid());

CREATE POLICY "proposals_admin" ON module_proposals
  FOR UPDATE USING (is_admin());

ALTER TABLE module_proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_votes_read_all" ON module_proposal_votes
  FOR SELECT USING (true);

CREATE POLICY "proposal_votes_own" ON module_proposal_votes
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- TABELE: AI
-- ============================================================================

ALTER TABLE ai_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_intents_read_all" ON ai_intents
  FOR SELECT USING (true);

CREATE POLICY "ai_intents_admin" ON ai_intents
  FOR ALL USING (is_admin());

ALTER TABLE voice_query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_log_own" ON voice_query_log
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "voice_log_insert_own" ON voice_query_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABELE: marketplace
-- ============================================================================

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_read_active" ON marketplace_listings
  FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "listings_insert_authenticated" ON marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());

CREATE POLICY "listings_update_own" ON marketplace_listings
  FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "listings_delete_own" ON marketplace_listings
  FOR DELETE USING (seller_id = auth.uid());

CREATE POLICY "listings_admin" ON marketplace_listings
  FOR ALL USING (is_admin());

ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msgs_read_participants" ON marketplace_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_admin());

CREATE POLICY "msgs_insert" ON marketplace_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "msgs_update_recipient" ON marketplace_messages
  FOR UPDATE USING (recipient_id = auth.uid());

ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_read_party" ON marketplace_purchases
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin());

CREATE POLICY "purchases_admin" ON marketplace_purchases
  FOR UPDATE USING (is_admin());

-- ============================================================================
-- TABELE: trusted_professionals
-- ============================================================================

ALTER TABLE trusted_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professionals_read_active" ON trusted_professionals
  FOR SELECT USING (is_active OR is_admin());

CREATE POLICY "professionals_admin" ON trusted_professionals
  FOR ALL USING (is_admin());

ALTER TABLE professional_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prof_reviews_read_all" ON professional_reviews
  FOR SELECT USING (true);

CREATE POLICY "prof_reviews_insert_reviewer" ON professional_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ============================================================================
-- TABELE: płatności i faktury
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_read_own" ON payments
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "payments_admin" ON payments
  FOR ALL USING (is_admin());

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_read_jokusor" ON invoices
  FOR SELECT USING (jokusor_id = auth.uid() OR is_admin());

CREATE POLICY "invoices_admin" ON invoices
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABELE: notifications, audit
-- ============================================================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_own" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_only" ON audit_log
  FOR SELECT USING (is_admin());

CREATE POLICY "audit_log_insert_system" ON audit_log
  FOR INSERT WITH CHECK (true);
  -- inserty z triggerów i Edge Functions

-- ============================================================================
-- KONIEC POLICIES
-- ============================================================================
