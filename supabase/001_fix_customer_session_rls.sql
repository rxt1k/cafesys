-- Fix customer QR flow RLS issues for session/order lifecycle
-- Compatible with Postgres versions that don't support CREATE POLICY IF NOT EXISTS
-- Run this in Supabase SQL editor

-- Ensure RLS is enabled
alter table public.tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_extras enable row level security;

-- Drop existing policies safely, then recreate

drop policy if exists "public can read active tables" on public.tables;
drop policy if exists "public can read active table sessions" on public.table_sessions;
drop policy if exists "public can create table sessions" on public.table_sessions;
drop policy if exists "public can create orders" on public.orders;
drop policy if exists "public can read orders" on public.orders;
drop policy if exists "public can update service requests on orders" on public.orders;
drop policy if exists "public can create order items" on public.order_items;
drop policy if exists "public can read order items" on public.order_items;
drop policy if exists "public can create order item extras" on public.order_item_extras;
drop policy if exists "public can read order item extras" on public.order_item_extras;

-- TABLES: public can read only active tables
create policy "public can read active tables"
on public.tables
for select
to anon, authenticated
using (is_active = true);

-- TABLE_SESSIONS: allow customer app to read active sessions and create one
create policy "public can read active table sessions"
on public.table_sessions
for select
to anon, authenticated
using (status = 'active');

create policy "public can create table sessions"
on public.table_sessions
for insert
to anon, authenticated
with check (
  table_id is not null
  and anonymous_id is not null
  and status = 'active'
);

-- ORDERS: allow customer to create/read/update orders by session
create policy "public can create orders"
on public.orders
for insert
to anon, authenticated
with check (
  table_id is not null
  and session_id is not null
  and status in ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')
);

create policy "public can read orders"
on public.orders
for select
to anon, authenticated
using (session_id is not null);

create policy "public can update service requests on orders"
on public.orders
for update
to anon, authenticated
using (session_id is not null)
with check (session_id is not null);

-- ORDER_ITEMS: allow add/read items for created orders
create policy "public can create order items"
on public.order_items
for insert
to anon, authenticated
with check (order_id is not null);

create policy "public can read order items"
on public.order_items
for select
to anon, authenticated
using (order_id is not null);

-- ORDER_ITEM_EXTRAS: allow add/read extras for order items
create policy "public can create order item extras"
on public.order_item_extras
for insert
to anon, authenticated
with check (order_item_id is not null);

create policy "public can read order item extras"
on public.order_item_extras
for select
to anon, authenticated
using (order_item_id is not null);

-- Helpful indexes for production
create index if not exists idx_table_sessions_table_status on public.table_sessions(table_id, status);
create index if not exists idx_orders_session_created_at on public.orders(session_id, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_item_extras_order_item_id on public.order_item_extras(order_item_id);
