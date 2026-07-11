-- Fix menu fetching RLS policies and automate table occupancy status via triggers
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on categories, dishes, and extras if not already enabled
alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.extras enable row level security;

-- 2. Drop existing select policies safely to prevent duplicates
drop policy if exists "public can read active categories" on public.categories;
drop policy if exists "public can read active dishes" on public.dishes;
drop policy if exists "public can read active extras" on public.extras;

-- 3. Create SELECT policies for anon/authenticated users (customers)
create policy "public can read active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "public can read active dishes"
on public.dishes
for select
to anon, authenticated
using (is_available = true and is_hidden = false);

create policy "public can read active extras"
on public.extras
for select
to anon, authenticated
using (is_available = true);

-- 4. Create trigger to automatically manage table status and current_session_id
create or replace function public.handle_table_session_status()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') and NEW.status = 'active' then
    -- When a new active session is created, update table to occupied
    update public.tables
    set status = 'occupied', current_session_id = NEW.id
    where id = NEW.table_id;
  elsif (TG_OP = 'UPDATE') then
    if NEW.status = 'closed' and OLD.status = 'active' then
      -- When an active session is closed, free the table (only if it matches the current session)
      update public.tables
      set status = 'free', current_session_id = null
      where id = NEW.table_id and current_session_id = NEW.id;
    elsif NEW.status = 'active' and OLD.status = 'closed' then
      -- When a session is reopened/activated, mark table occupied
      update public.tables
      set status = 'occupied', current_session_id = NEW.id
      where id = NEW.table_id;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Recreate trigger safely
drop trigger if exists on_table_session_status on public.table_sessions;
create trigger on_table_session_status
  after insert or update on public.table_sessions
  for each row execute function public.handle_table_session_status();
