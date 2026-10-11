-- TRINERGY v6.1 SAFE DATABASE UPGRADE
-- Run ONLY in Supabase project: trinergy-qr-pilot
-- Non-destructive.

create table if not exists public.tqr_historical_months(
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  ups_type text not null check (ups_type in ('3X','2X','STS')),
  target integer not null default 0,
  received integer not null default 0,
  completed integer not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  unique(month_start,ups_type)
);

alter table public.tqr_historical_months enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tqr_historical_months' and policyname='pilot historical all') then
  create policy "pilot historical all" on public.tqr_historical_months for all to anon using(true) with check(true);
 end if;
end $$;

insert into public.tqr_settings(setting_key,setting_value)
values ('qr_next_number',1)
on conflict(setting_key) do nothing;

-- These are safe guards for admin toggles.
alter table public.tqr_bays add column if not exists active boolean not null default true;

-- Engineer add bug guard: case-insensitive uniqueness.
create unique index if not exists tqr_engineers_name_ci_uq on public.tqr_engineers(lower(engineer_name));

do $$ begin
 begin alter publication supabase_realtime add table public.tqr_historical_months; exception when duplicate_object then null; end;
end $$;
