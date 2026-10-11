-- TRINERGY v6.13 COMPLETED TERMINAL LOCK
-- Run ONCE in Supabase project: trinergy-qr-pilot
-- Once a UPS is COMPLETED, its status/current_stage cannot be moved back to Buffer/Testing/Fault/Parking.

create or replace function public.tqr_guard_completed_terminal()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'COMPLETED' then
    if new.status is distinct from 'COMPLETED'
       or new.current_stage is distinct from 'COMPLETED'
       or coalesce(new.parked,false) = true then
      raise exception 'UPS is already COMPLETED and is locked from further testing updates';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tqr_guard_completed_terminal on public.tqr_units;
create trigger trg_tqr_guard_completed_terminal
before update on public.tqr_units
for each row execute function public.tqr_guard_completed_terminal();

-- Prevent any new active physical bay allocation for a completed UPS.
create or replace function public.tqr_guard_completed_occupancy()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  if new.released_at is null then
    select status into v_status from public.tqr_units where id = new.unit_id;
    if v_status = 'COMPLETED' then
      raise exception 'Completed UPS cannot be assigned to a test bay';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tqr_guard_completed_occupancy on public.tqr_bay_occupancy;
create trigger trg_tqr_guard_completed_occupancy
before insert or update on public.tqr_bay_occupancy
for each row execute function public.tqr_guard_completed_occupancy();

-- Verification: this should normally return zero rows.
select u.serial_number,u.status,b.bay_name,o.section
from public.tqr_units u
join public.tqr_bay_occupancy o on o.unit_id=u.id and o.released_at is null
join public.tqr_bays b on b.id=o.bay_id
where u.status='COMPLETED';
