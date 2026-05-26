-- Cache login handle for staff (no Auth Admin API required for display labels).
alter table public.staff_roles
  add column if not exists login_username text;

comment on column public.staff_roles.login_username is
  'Login username (local part of username@domain auth email). Set on invite; backfilled from auth.users.';

-- Backfill from Supabase Auth emails (any pattern).
update public.staff_roles sr
set login_username = lower(split_part(u.email, '@', 1))
from auth.users u
where sr.user_id = u.id
  and sr.login_username is null
  and u.email is not null;
