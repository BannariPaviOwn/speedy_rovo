-- Restrict schedule + venue data to staff (admin / superadmin) via staff_roles.
-- Run in Supabase SQL Editor after prior migration, or via supabase db push.

-- ---------------------------------------------------------------------------
-- Helper: current user is admin or superadmin
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('admin', 'superadmin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Drop permissive authenticated policies (from initial migration)
-- ---------------------------------------------------------------------------
drop policy if exists "venues_authenticated_all" on public.venues;
drop policy if exists "courts_authenticated_all" on public.courts;
drop policy if exists "court_slot_entries_authenticated_all" on public.court_slot_entries;
drop policy if exists "bookings_authenticated_all" on public.bookings;
drop policy if exists "staff_roles_authenticated_select" on public.staff_roles;
drop policy if exists "staff_roles_service_or_superadmin" on public.staff_roles;
drop policy if exists "staff_roles_authenticated_update" on public.staff_roles;

-- ---------------------------------------------------------------------------
-- Venues & courts: staff only
-- ---------------------------------------------------------------------------
create policy "venues_staff_all"
  on public.venues for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "courts_staff_all"
  on public.courts for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Slot grid: staff only (read + write)
-- ---------------------------------------------------------------------------
create policy "court_slot_entries_staff_all"
  on public.court_slot_entries for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Bookings: staff only
-- ---------------------------------------------------------------------------
create policy "bookings_staff_all"
  on public.bookings for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Staff roles: read own row (for client role check); manage via dashboard / service role
-- ---------------------------------------------------------------------------
create policy "staff_roles_select_own"
  on public.staff_roles for select
  to authenticated
  using (user_id = auth.uid());
