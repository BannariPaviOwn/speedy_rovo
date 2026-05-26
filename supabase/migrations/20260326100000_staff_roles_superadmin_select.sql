-- Superadmins may list and update staff_roles via the authenticated client (Admins page).
-- Create/delete staff still uses the service role (Auth Admin API) in app server code.

create or replace function public.is_superadmin()
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
      and sr.role = 'superadmin'
      and coalesce(sr.is_active, true)
      and coalesce(sr.status, 'active') = 'active'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

create policy "staff_roles_superadmin_select"
  on public.staff_roles for select
  to authenticated
  using (public.is_superadmin());

create policy "staff_roles_superadmin_update"
  on public.staff_roles for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
