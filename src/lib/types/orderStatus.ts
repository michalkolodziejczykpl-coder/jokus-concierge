// Mirrors enum `order_status` in SQL.
// Pulled to its own file so both `Order` (read) and order-event helpers can
// import without circular deps once we add the events table types.

export type OrderStatus =
  | 'draft'
  | 'hold'
  | 'pending'
  | 'accepted'
  | 'in_transit'
  | 'at_pickup'
  | 'in_progress'
  | 'in_return'
  | 'completed'
  | 'cancelled'
  | 'disputed';
