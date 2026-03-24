-- Row lifecycle: `status` (workflow) + `is_active` (quick hide).
-- Bookings already have `status` (booking_status enum); only add `is_active` there.

-- ---------------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------------
alter table public.venues
  add column if not exists status text not null default 'active',
  add column if not exists is_active boolean not null default true;

alter table public.venues drop constraint if exists venues_status_check;
alter table public.venues
  add constraint venues_status_check check (
    status in ('active', 'inactive', 'draft', 'archived')
  );

comment on column public.venues.status is
  'Lifecycle: active, inactive, draft, archived.';
comment on column public.venues.is_active is
  'When false, hidden from schedule venue list and staff invite picker.';

-- ---------------------------------------------------------------------------
-- courts (is_active already exists)
-- ---------------------------------------------------------------------------
alter table public.courts
  add column if not exists status text not null default 'active';

alter table public.courts drop constraint if exists courts_status_check;
alter table public.courts
  add constraint courts_status_check check (
    status in ('active', 'inactive', 'draft', 'archived')
  );

comment on column public.courts.status is
  'Lifecycle alongside is_active; schedule queries require both active.';

-- ---------------------------------------------------------------------------
-- court_slot_entries
-- ---------------------------------------------------------------------------
alter table public.court_slot_entries
  add column if not exists status text not null default 'active',
  add column if not exists is_active boolean not null default true;

alter table public.court_slot_entries drop constraint if exists court_slot_entries_row_status_check;
alter table public.court_slot_entries
  add constraint court_slot_entries_row_status_check check (
    status in ('active', 'inactive', 'draft', 'archived')
  );

comment on column public.court_slot_entries.status is
  'Row lifecycle (separate from slot kind).';
comment on column public.court_slot_entries.is_active is
  'When false, slot omitted from schedule load.';

-- ---------------------------------------------------------------------------
-- bookings (keep existing `status` = booking workflow)
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists is_active boolean not null default true;

comment on column public.bookings.is_active is
  'When false, hide from operational booking lists.';

-- ---------------------------------------------------------------------------
-- staff_roles
-- ---------------------------------------------------------------------------
alter table public.staff_roles
  add column if not exists status text not null default 'active',
  add column if not exists is_active boolean not null default true;

alter table public.staff_roles drop constraint if exists staff_roles_row_status_check;
alter table public.staff_roles
  add constraint staff_roles_row_status_check check (
    status in ('active', 'inactive', 'draft', 'archived')
  );

comment on column public.staff_roles.status is
  'Staff membership lifecycle.';
comment on column public.staff_roles.is_active is
  'When false, user cannot act as staff (login may still work; app denies role).';
