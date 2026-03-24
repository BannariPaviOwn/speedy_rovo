-- Per-venue operating window for the schedule grid (hourly slots, end exclusive).
-- Example: 18–22 → slots 18:00 … 21:00 (6 PM–10 PM).

alter table public.venues
  add column if not exists schedule_start_hour smallint not null default 6,
  add column if not exists schedule_end_hour smallint not null default 22;

alter table public.venues drop constraint if exists venues_schedule_hours_check;

alter table public.venues
  add constraint venues_schedule_hours_check check (
    schedule_start_hour >= 0
    and schedule_start_hour <= 23
    and schedule_end_hour >= 1
    and schedule_end_hour <= 24
    and schedule_end_hour > schedule_start_hour
  );

comment on column public.venues.schedule_start_hour is
  'First hourly slot start (0–23). Matches generateSlotTimes start.';

comment on column public.venues.schedule_end_hour is
  'Exclusive end hour (1–24). Last slot starts at end_hour - 1 (e.g. 22 → through 21:00).';
