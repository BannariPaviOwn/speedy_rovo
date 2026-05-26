-- Multi-sport venues, per-sport slot granularity, and booking duration (e.g. cricket 1h / 1.5h / 2h).

-- ---------------------------------------------------------------------------
-- Sports catalog (fixed set; extend via insert)
-- ---------------------------------------------------------------------------
create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

insert into public.sports (slug, name, sort_order) values
  ('badminton', 'Badminton', 10),
  ('basketball', 'Basketball', 20),
  ('football', 'Football', 30),
  ('cricket', 'Cricket', 40),
  ('pickleball', 'Pickleball', 50),
  ('tennis', 'Tennis', 60),
  ('volleyball', 'Volleyball', 70),
  ('other', 'Other', 99)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Which sports a venue offers + how the schedule grid steps + booking lengths
-- ---------------------------------------------------------------------------
create table if not exists public.venue_sports (
  venue_id uuid not null references public.venues (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete restrict,
  slot_step_minutes int not null default 60,
  duration_options_minutes int[] not null default array[60]::int[],
  primary key (venue_id, sport_id),
  constraint venue_sports_slot_step check (slot_step_minutes in (30, 60)),
  constraint venue_sports_duration_nonempty check (
    cardinality(duration_options_minutes) >= 1
  )
);

create index if not exists venue_sports_venue_id_idx
  on public.venue_sports (venue_id);

-- ---------------------------------------------------------------------------
-- Each court is for one sport at that venue
-- ---------------------------------------------------------------------------
alter table public.courts
  add column if not exists sport_id uuid references public.sports (id);

do $$
declare
  badminton_id uuid;
begin
  select id into badminton_id from public.sports where slug = 'badminton' limit 1;
  if badminton_id is null then
    raise exception 'badminton sport row missing';
  end if;
  update public.courts set sport_id = badminton_id where sport_id is null;
end $$;

insert into public.venue_sports (venue_id, sport_id, slot_step_minutes, duration_options_minutes)
select distinct c.venue_id, c.sport_id, 60, array[60]::int[]
from public.courts c
where c.sport_id is not null
on conflict (venue_id, sport_id) do nothing;

alter table public.courts alter column sport_id set not null;

-- ---------------------------------------------------------------------------
-- Slot rows: optional multi-step span from start_time
-- ---------------------------------------------------------------------------
alter table public.court_slot_entries
  add column if not exists duration_minutes int not null default 60;

alter table public.court_slot_entries
  drop constraint if exists court_slot_entries_time_hourly;

alter table public.court_slot_entries
  add constraint court_slot_entries_start_half_hour check (
    extract(second from start_time) = 0
    and extract(minute from start_time) in (0, 30)
  );

alter table public.court_slot_entries
  add constraint court_slot_entries_duration_half_hour check (
    duration_minutes >= 30
    and duration_minutes % 30 = 0
  );

comment on column public.court_slot_entries.duration_minutes is
  'Length of this booking from start_time; grid expands for slot_step_minutes of the court''s sport.';

comment on table public.venue_sports is
  'Sports offered at a venue: slot row step (30 or 60 min) and allowed booking lengths in minutes.';

-- ---------------------------------------------------------------------------
-- RLS (staff — same as venues/courts)
-- ---------------------------------------------------------------------------
alter table public.sports enable row level security;
alter table public.venue_sports enable row level security;

drop policy if exists "sports_staff_select" on public.sports;
create policy "sports_staff_select"
  on public.sports for select
  to authenticated
  using (public.is_staff());

drop policy if exists "venue_sports_staff_all" on public.venue_sports;
create policy "venue_sports_staff_all"
  on public.venue_sports for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
