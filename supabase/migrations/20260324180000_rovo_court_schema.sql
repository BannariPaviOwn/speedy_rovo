-- Rovo Court Admin — core schema (matches app: SlotKind, ScheduleCell, courts, schedule grid)
-- Apply in Supabase: SQL Editor → New query → paste, or `supabase db push` with CLI.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.slot_kind as enum (
    'available',
    'booked',
    'reserved',
    'maintenance',
    'blocked',
    'membership'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.admin_role as enum ('superadmin', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('confirmed', 'waitlist', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Venues & courts
-- ---------------------------------------------------------------------------
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, slug)
);

create index if not exists courts_venue_id_idx on public.courts (venue_id);

-- ---------------------------------------------------------------------------
-- One row per court × calendar day × hour start (grid cell / slot edit modal)
-- Maps to ScheduleCell + key `${slug}::HH:MM` in the app (use court.slug + time).
-- ---------------------------------------------------------------------------
create table if not exists public.court_slot_entries (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  kind public.slot_kind not null default 'blocked',
  label text,
  subtitle text,
  membership_detail text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (court_id, slot_date, start_time),
  constraint court_slot_entries_time_hourly check (
    extract(minute from start_time) = 0
    and extract(second from start_time) = 0
  )
);

create index if not exists court_slot_entries_lookup_idx
  on public.court_slot_entries (slot_date, court_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists court_slot_entries_set_updated_at on public.court_slot_entries;
create trigger court_slot_entries_set_updated_at
  before update on public.court_slot_entries
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Player-facing bookings (Bookings page / future API)
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_slot_entry_id uuid references public.court_slot_entries (id) on delete set null,
  player_name text not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists bookings_slot_idx on public.bookings (court_slot_entry_id);

-- ---------------------------------------------------------------------------
-- Staff roles (Admin vs Superadmin) — links to Supabase Auth
-- ---------------------------------------------------------------------------
create table if not exists public.staff_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.admin_role not null,
  venue_id uuid references public.venues (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id),
  constraint staff_roles_venue_scope check (
    (role = 'superadmin' and venue_id is null)
    or (role = 'admin')
  )
);

-- ---------------------------------------------------------------------------
-- Seed: one venue + five courts (slugs c1..c5 — align with mockCourts)
-- ---------------------------------------------------------------------------
insert into public.venues (id, name, city)
values (
  '00000000-0000-4000-8000-000000000001',
  'Rovo Arena',
  'Bengaluru'
)
on conflict (id) do nothing;

insert into public.courts (venue_id, slug, label, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'c1', 'COURT 01', 1),
  ('00000000-0000-4000-8000-000000000001', 'c2', 'COURT 02', 2),
  ('00000000-0000-4000-8000-000000000001', 'c3', 'COURT 03', 3),
  ('00000000-0000-4000-8000-000000000001', 'c4', 'COURT 04', 4),
  ('00000000-0000-4000-8000-000000000001', 'c5', 'COURT 05', 5)
on conflict (venue_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security (adjust for production)
-- ---------------------------------------------------------------------------
alter table public.venues enable row level security;
alter table public.courts enable row level security;
alter table public.court_slot_entries enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_roles enable row level security;

-- Authenticated users can manage app data (tighten with staff_roles checks later)
create policy "venues_authenticated_all"
  on public.venues for all
  to authenticated
  using (true) with check (true);

create policy "courts_authenticated_all"
  on public.courts for all
  to authenticated
  using (true) with check (true);

create policy "court_slot_entries_authenticated_all"
  on public.court_slot_entries for all
  to authenticated
  using (true) with check (true);

create policy "bookings_authenticated_all"
  on public.bookings for all
  to authenticated
  using (true) with check (true);

create policy "staff_roles_authenticated_select"
  on public.staff_roles for select
  to authenticated
  using (true);

create policy "staff_roles_service_or_superadmin"
  on public.staff_roles for insert
  to authenticated
  with check (true);

create policy "staff_roles_authenticated_update"
  on public.staff_roles for update
  to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
comment on table public.court_slot_entries is
  'Grid cell: one per court × date × hour (6:00–21:00 for 6–22 window). UI key: slug::HH:MM on that date.';

comment on column public.court_slot_entries.membership_detail is
  'Shown when kind = membership (plan / member id).';

comment on column public.court_slot_entries.notes is
  'Short internal note; membership slots use together with membership_detail.';
