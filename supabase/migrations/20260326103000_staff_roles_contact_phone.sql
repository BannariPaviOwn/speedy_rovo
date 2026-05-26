-- Venue admin contact number (shown on schedule for that venue).

alter table public.staff_roles
  add column if not exists contact_phone text;

comment on column public.staff_roles.contact_phone is
  'Mobile / contact for this admin; shown on the schedule for their mapped venue.';

-- Peer-select policy is in a follow-up migration using SECURITY DEFINER (avoids RLS recursion).
