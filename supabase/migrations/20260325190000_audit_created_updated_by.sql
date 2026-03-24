-- Who created / last updated each row (Supabase Auth user id).

alter table public.venues
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

alter table public.courts
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

alter table public.court_slot_entries
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

alter table public.bookings
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

alter table public.staff_roles
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

comment on column public.venues.created_by is 'Auth user who created the row (set by trigger or app).';
comment on column public.venues.updated_by is 'Auth user who last changed the row (including status / is_active).';

-- Fills from JWT when present; service-role calls may pass ids explicitly in the app.
create or replace function public.set_audit_user_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null and auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    if new.updated_by is null and auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
  elsif tg_op = 'UPDATE' then
    if auth.uid() is not null then
      new.updated_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists venues_set_audit on public.venues;
create trigger venues_set_audit
  before insert or update on public.venues
  for each row execute function public.set_audit_user_fields();

drop trigger if exists courts_set_audit on public.courts;
create trigger courts_set_audit
  before insert or update on public.courts
  for each row execute function public.set_audit_user_fields();

drop trigger if exists court_slot_entries_set_audit on public.court_slot_entries;
create trigger court_slot_entries_set_audit
  before insert or update on public.court_slot_entries
  for each row execute function public.set_audit_user_fields();

drop trigger if exists bookings_set_audit on public.bookings;
create trigger bookings_set_audit
  before insert or update on public.bookings
  for each row execute function public.set_audit_user_fields();

drop trigger if exists staff_roles_set_audit on public.staff_roles;
create trigger staff_roles_set_audit
  before insert or update on public.staff_roles
  for each row execute function public.set_audit_user_fields();
