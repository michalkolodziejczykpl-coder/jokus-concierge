// Marketplace types — mirrors the marketplace_listings + marketplace_purchases
// schemas (migration 01, lines 403+). Only the columns used in sprint D-1 are
// declared. Photos / messaging fields will land when those features ship.

export type ListingCategory =
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'home'
  | 'kids'
  | 'sports'
  | 'other';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'used' | 'for_parts';

export type ListingStatus = 'active' | 'reserved' | 'sold' | 'archived' | 'removed';

export type DeliveryOption = 'migmig_only' | 'pickup_only' | 'migmig_or_pickup';

export type PickupAddress = {
  street: string;
  building: string;
  apartment: string | null;
  city: string;
  postal_code: string;
};

export type ListingRow = {
  id: string;
  seller_id: string;
  estate_id: string;
  title: string;
  description: string | null;
  category: ListingCategory;
  price: number;
  currency: string;
  condition: ListingCondition;
  status: ListingStatus;
  photos: string[];
  pickup_address: PickupAddress;
  delivery_option: DeliveryOption;
  views_count: number;
  created_at: string;
};

// POST /api/marketplace/listings — body shape
export type CreateListingInput = {
  title: string;
  description?: string;
  category: ListingCategory;
  price: number;
  condition: ListingCondition;
  delivery_option?: DeliveryOption;
  pickup_address: PickupAddress;
};

// Human-friendly labels for select dropdowns + badges.
export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  electronics: 'Elektronika',
  clothing: 'Odzież',
  books: 'Książki',
  home: 'Dom i wnętrze',
  kids: 'Dzieci',
  sports: 'Sport',
  other: 'Inne'
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Nowe',
  like_new: 'Jak nowe',
  good: 'Bardzo dobry',
  used: 'Używane',
  for_parts: 'Na części'
};

export const DELIVERY_OPTION_LABELS: Record<DeliveryOption, string> = {
  migmig_only: 'Tylko dostawa JOKUS',
  pickup_only: 'Tylko odbiór osobisty',
  migmig_or_pickup: 'Dostawa JOKUS lub odbiór osobisty'
};
