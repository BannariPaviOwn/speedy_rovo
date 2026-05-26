-- Add staff_roles.login_username (Admins list, audit labels without service role).
--
-- Run in Supabase Dashboard → SQL Editor when you do not use `supabase db push`.
-- Safe to re-run (idempotent).
--
-- After this, new admins get login_username from the app invite form; existing rows
-- are backfilled from auth.users.email local-part.

alter table public.staff_roles
  add column if not exists login_username text;

comment on column public.staff_roles.login_username is
  'Login username (local part of username@domain auth email). Set on invite; backfilled from auth.users.';

update public.staff_roles sr
set login_username = lower(split_part(u.email, '@', 1))
from auth.users u
where sr.user_id = u.id
  and sr.login_username is null
  and u.email is not null;

-- Verify:
-- select user_id, login_username, role from public.staff_roles order by created_at;
