-- Reading staff_roles from inside a staff_roles SELECT policy causes infinite recursion.
-- Use SECURITY DEFINER so the viewer lookup bypasses RLS on staff_roles.

drop policy if exists "staff_roles_select_same_venue_admins" on public.staff_roles;

create or replace function public.staff_roles_viewer_can_see_venue_admins(target_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles me
    where me.user_id = auth.uid()
      and coalesce(me.is_active, true) = true
      and coalesce(me.status, 'active') = 'active'
      and me.role in ('admin', 'superadmin')
      and (
        me.role = 'superadmin'
        or (me.role = 'admin' and me.venue_id = target_venue_id)
      )
  );
$$;

comment on function public.staff_roles_viewer_can_see_venue_admins(uuid) is
  'True when the current user may read venue admin rows for target_venue_id (schedule contacts).';

grant execute on function public.staff_roles_viewer_can_see_venue_admins(uuid) to authenticated;

create policy "staff_roles_select_same_venue_admins"
  on public.staff_roles for select
  to authenticated
  using (
    role = 'admin'
    and venue_id is not null
    and public.staff_roles_viewer_can_see_venue_admins(venue_id)
  );
