-- Backfill login_username for all staff from auth.users (any email pattern).
-- Lets audit labels and the Admins table show handles without SUPABASE_SERVICE_ROLE_KEY.
update public.staff_roles sr
set login_username = lower(split_part(u.email, '@', 1))
from auth.users u
where sr.user_id = u.id
  and sr.login_username is null
  and u.email is not null;
