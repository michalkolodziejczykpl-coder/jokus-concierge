-- Sprint E (part): in-app chat between a resident and the assigned jokusor,
-- scoped to one order. Mirrors marketplace_messages. RODO-friendly: messages
-- stay in-app (no phone numbers exposed).

create table if not exists order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sender_id uuid not null references users(id),
  recipient_id uuid not null references users(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_order_msgs_order on order_messages(order_id, created_at);
create index if not exists idx_order_msgs_recipient_unread
  on order_messages(recipient_id) where read_at is null;

alter table order_messages enable row level security;

drop policy if exists "order_msgs_read_participants" on order_messages;
create policy "order_msgs_read_participants" on order_messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid() or is_admin());

drop policy if exists "order_msgs_insert" on order_messages;
create policy "order_msgs_insert" on order_messages
  for insert with check (sender_id = auth.uid());

drop policy if exists "order_msgs_update_recipient" on order_messages;
create policy "order_msgs_update_recipient" on order_messages
  for update using (recipient_id = auth.uid());
