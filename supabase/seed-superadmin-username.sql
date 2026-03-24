-- First-time setup only (before you can use the in-app “Create admin” form).
--
-- Supabase Dashboard → Authentication → “Add user” asks for an “Email” field.
-- This app does not use real email — put your USERNAME in this form only by using
-- the pattern:  yourusername@{NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN or speedy.user}
-- Example username `bans` → paste:  bans@speedy.user
-- That value is not an inbox; it is only how Supabase stores a username internally.
--
-- Then grant superadmin (replace UUID with the new user’s id from Authentication → Users):

insert into public.staff_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'superadmin')
on conflict (user_id) do update set role = excluded.role;
