-- Admins may read all staff-visible slots but only INSERT/UPDATE/DELETE slots for courts in their venue.
-- Superadmins may write any slot.
--
-- `is_staff()` is defined in 20260324210000_rls_staff_only.sql; recreate here so this migration
-- can run alone (e.g. SQL Editor) if that file was skipped.

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

create or replace function public.staff_may_write_court_slot(p_court_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.staff_roles sr
      where sr.user_id = auth.uid()
        and sr.role = 'superadmin'
        and coalesce(sr.is_active, true)
        and coalesce(sr.status, 'active') = 'active'
    )
    or exists (
      select 1
      from public.staff_roles sr
      inner join public.courts c
        on c.id = p_court_id
        and c.venue_id = sr.venue_id
      where sr.user_id = auth.uid()
        and sr.role = 'admin'
        and coalesce(sr.is_active, true)
        and coalesce(sr.status, 'active') = 'active'
    );
$$;

grant execute on function public.staff_may_write_court_slot(uuid) to authenticated;

drop policy if exists "court_slot_entries_staff_all" on public.court_slot_entries;

create policy "court_slot_entries_staff_select"
  on public.court_slot_entries for select
  to authenticated
  using (public.is_staff());

create policy "court_slot_entries_staff_insert"
  on public.court_slot_entries for insert
  to authenticated
  with check (
    public.is_staff()
    and public.staff_may_write_court_slot(court_id)
  );

create policy "court_slot_entries_staff_update"
  on public.court_slot_entries for update
  to authenticated
  using (
    public.is_staff()
    and public.staff_may_write_court_slot(court_id)
  )
  with check (
    public.is_staff()
    and public.staff_may_write_court_slot(court_id)
  );

create policy "court_slot_entries_staff_delete"
  on public.court_slot_entries for delete
  to authenticated
  using (
    public.is_staff()
    and public.staff_may_write_court_slot(court_id)
  );
