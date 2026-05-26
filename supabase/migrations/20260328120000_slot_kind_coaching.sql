-- App SlotKind: coaching (lessons / coach-led sessions)

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'slot_kind'
      and e.enumlabel = 'coaching'
  ) then
    alter type public.slot_kind add value 'coaching';
  end if;
end
$$;
