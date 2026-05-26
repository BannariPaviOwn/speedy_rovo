-- Grant superadmin to a username-based staff account (Speedy app).
--
-- Run in Supabase Dashboard → SQL Editor (service role / postgres bypasses RLS).
--
-- Login mapping: username `bans` → auth email `bans@speedy.user`
-- (domain from NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN, default `speedy.user`).
--
-- 1) Confirm the auth user exists:
--    select id, email from auth.users where lower(email) = lower('bans@speedy.user');
--
-- 2) Grant superadmin:

insert into public.staff_roles (user_id, login_username, role, venue_id, status, is_active)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  'superadmin'::public.admin_role,
  null,
  'active',
  true
from auth.users u
where lower(u.email) = lower('bans@speedy.user')
on conflict (user_id) do update set
  login_username = coalesce(
    public.staff_roles.login_username,
    excluded.login_username
  ),
  role = excluded.role,
  venue_id = null,
  status = 'active',
  is_active = true;

-- 3) Verify (run as that user in the app, or):
--    select * from public.staff_roles sr
--    join auth.users u on u.id = sr.user_id
--    where lower(u.email) = lower('bans@speedy.user');
