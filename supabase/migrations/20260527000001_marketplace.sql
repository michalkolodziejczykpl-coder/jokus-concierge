-- Sprint D-1: marketplace foundation.
-- (1) New module 'marketplace-delivery' with is_global=false so it doesn't
--     appear in the resident tile catalog (/home). Only created indirectly
--     through the marketplace buy flow.
-- (2) SECURITY DEFINER function create_marketplace_purchase(listing_id) that
--     atomically: locks listing → creates draft order with pickup_address from
--     listing → creates marketplace_purchases row linking listing+order →
--     reserves listing. Returns the new order.id so the caller can redirect
--     the buyer to the slot picker.
-- (3) marketplace_purchases needs no INSERT policy because we use SECURITY
--     DEFINER (bypasses RLS).

-- ===========================================================================
-- (1) marketplace-delivery module
-- ===========================================================================
-- Idempotent insert: if a row with this slug already exists, do nothing.

INSERT INTO public.modules (
  slug, name, description, category, icon_name,
  base_price, price_unit, estimated_duration_min,
  requires_pickup, requires_age_verification,
  custom_fields, is_global, sort_order
)
VALUES (
  'marketplace-delivery',
  'Dostawa z marketplace osiedlowego',
  'Jokusor odbiera przedmiot od sprzedawcy z osiedla i dostarcza pod Twoje drzwi.',
  'marketplace',
  'ShoppingBag',
  5.00, 'fixed', 45,
  true, false,
  '[]'::jsonb,
  false,
  60
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================================================
-- (2) create_marketplace_purchase
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.create_marketplace_purchase(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_listing RECORD;
  v_buyer_addr RECORD;
  v_module RECORD;
  v_new_order_id uuid;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Lock the listing for the duration of this transaction
  SELECT id, seller_id, estate_id, title, price, pickup_address, status
  INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_listing.seller_id = v_buyer_id THEN
    RAISE EXCEPTION 'cannot_buy_own_listing' USING ERRCODE = 'P0001';
  END IF;
  IF v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'listing_not_active' USING ERRCODE = 'P0001';
  END IF;

  -- Buyer needs a default address (delivery destination)
  SELECT id, estate_id
  INTO v_buyer_addr
  FROM addresses
  WHERE user_id = v_buyer_id AND is_default
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'buyer_no_default_address' USING ERRCODE = 'P0001';
  END IF;

  -- Marketplace delivery module
  SELECT id, base_price, estimated_duration_min
  INTO v_module
  FROM modules
  WHERE slug = 'marketplace-delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_module_missing' USING ERRCODE = 'P0001';
  END IF;

  -- Create the delivery order in draft. total_price = delivery + item price.
  -- pickup_address mirrors the listing's pickup_address jsonb so the jokusor
  -- knows where to fetch the item from.
  INSERT INTO orders (
    resident_id, module_id, estate_id, address_id,
    pickup_address, status,
    base_price, total_price,
    custom_data, notes,
    estimated_duration_min, created_via
  )
  VALUES (
    v_buyer_id,
    v_module.id,
    v_buyer_addr.estate_id,
    v_buyer_addr.id,
    v_listing.pickup_address,
    'draft',
    v_module.base_price,
    v_module.base_price + v_listing.price,
    jsonb_build_object(
      'listing_id', v_listing.id,
      'listing_title', v_listing.title,
      'item_price', v_listing.price
    ),
    'Dostawa z marketplace: ' || v_listing.title,
    v_module.estimated_duration_min,
    'marketplace'
  )
  RETURNING id INTO v_new_order_id;

  -- Reserve listing so others can't double-buy
  UPDATE marketplace_listings
  SET status = 'reserved'
  WHERE id = p_listing_id;

  -- Link purchase to order
  INSERT INTO marketplace_purchases (
    listing_id, buyer_id, seller_id, delivery_order_id,
    item_price, delivery_price, payment_status, payment_method
  )
  VALUES (
    v_listing.id, v_buyer_id, v_listing.seller_id, v_new_order_id,
    v_listing.price, v_module.base_price, 'pending', 'blik_escrow'
  );

  RETURN v_new_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_purchase(uuid) TO authenticated;
