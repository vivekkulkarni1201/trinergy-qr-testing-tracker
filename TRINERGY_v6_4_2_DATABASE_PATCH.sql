-- TRINERGY v6.4.2 STABILITY DATABASE PATCH
-- Run ONCE in Supabase project: trinergy-qr-pilot
-- Fixes:
-- 1) Allow RTA/Faulty status.
-- 2) Remove the wrong historical occupancy unique constraint that blocks re-entry.
-- 3) Keep uniqueness only for ACTIVE occupancy.

-- A. Rebuild tqr_units status check safely.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='tqr_units'
      and c.contype='c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.tqr_units drop constraint %I',r.conname);
  end loop;
end $$;

alter table public.tqr_units
  add constraint tqr_units_status_check
  check (status in ('RECEIVED','UNDER_TESTING','STOCK','COMPLETED','RTA'));

-- B. Remove the wrong unique constraint that prevents the same UPS
-- from ever returning to the same section after a released historical occupancy.
alter table public.tqr_bay_occupancy
  drop constraint if exists tqr_bay_occupancy_unit_id_section_key;

-- Clean accidental duplicate ACTIVE occupancy records, keeping the newest one per UPS.
with ranked as (
  select id,
         row_number() over(partition by unit_id order by occupied_at desc nulls last, id desc) rn
  from public.tqr_bay_occupancy
  where released_at is null
)
update public.tqr_bay_occupancy o
set released_at = now()
from ranked r
where o.id=r.id and r.rn>1;

-- Clean accidental duplicate ACTIVE occupancy records per physical bay section.
with ranked as (
  select id,
         row_number() over(partition by bay_id,section order by occupied_at desc nulls last, id desc) rn
  from public.tqr_bay_occupancy
  where released_at is null
)
update public.tqr_bay_occupancy o
set released_at = now()
from ranked r
where o.id=r.id and r.rn>1;

create unique index if not exists tqr_bay_active_section_uq
  on public.tqr_bay_occupancy(bay_id,section)
  where released_at is null;

create unique index if not exists tqr_unit_active_occupancy_uq
  on public.tqr_bay_occupancy(unit_id)
  where released_at is null;
