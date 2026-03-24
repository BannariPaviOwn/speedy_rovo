-- Inclusive end date for a slot edit applied across multiple calendar days.
alter table public.court_slot_entries
  add column if not exists till_date date;

comment on column public.court_slot_entries.till_date is
  'Inclusive last calendar day this slot state applies (same on each row when materialized for a range).';
