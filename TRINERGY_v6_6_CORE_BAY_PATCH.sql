-- TRINERGY v6.6 CORE BAY SIMPLIFICATION PATCH
-- Run ONCE in Supabase project trinergy-qr-pilot.
-- Core physical LV/HV sections are removed.
-- Every active Core Test Bay supports exactly 2 simultaneous UPS via SLOT1 / SLOT2.
-- Logical LV/HV test stages remain unchanged.

-- Drop old active bay-section uniqueness so active Core rows can be remapped safely.
drop index if exists public.tqr_bay_active_section_uq;

-- If more than 2 active UPS somehow exist in one Core bay, keep the newest two and
-- release extras to avoid an impossible physical state.
with core_active as (
  select o.id,
         row_number() over(partition by o.bay_id order by o.occupied_at desc nulls last,o.id desc) rn
  from public.tqr_bay_occupancy o
  join public.tqr_bays b on b.id=o.bay_id
  where o.released_at is null and b.bay_kind='CORE'
)
update public.tqr_bay_occupancy o
set released_at=now()
from core_active x
where o.id=x.id and x.rn>2;

-- Map active Core occupancy to generic physical slots.
with core_active as (
  select o.id,
         row_number() over(partition by o.bay_id order by o.occupied_at,o.id) rn
  from public.tqr_bay_occupancy o
  join public.tqr_bays b on b.id=o.bay_id
  where o.released_at is null and b.bay_kind='CORE'
)
update public.tqr_bay_occupancy o
set section=case when x.rn=1 then 'SLOT1' else 'SLOT2' end
from core_active x
where o.id=x.id;

-- STS dedicated bays remain exactly as before.
create unique index if not exists tqr_bay_active_section_uq
  on public.tqr_bay_occupancy(bay_id,section)
  where released_at is null;

-- One UPS can occupy only one physical location at a time.
create unique index if not exists tqr_unit_active_occupancy_uq
  on public.tqr_bay_occupancy(unit_id)
  where released_at is null;
