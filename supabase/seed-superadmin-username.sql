-- First-time setup: grant superadmin by username (before in-app “Create admin” works).
--
-- Auth user must exist with email = `{username}@{domain}` (not a real inbox).
-- Default domain: speedy.user  →  username `bans`  →  bans@speedy.user
--
-- Supabase Dashboard → Authentication → Add user:
--   Email field: bans@speedy.user
--   Password: (your choice)
--
-- Then run this file in SQL Editor (replace username / email if needed):

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

-- No row inserted? The auth user email does not match — check:
--   select id, email from auth.users order by created_at desc limit 20;
