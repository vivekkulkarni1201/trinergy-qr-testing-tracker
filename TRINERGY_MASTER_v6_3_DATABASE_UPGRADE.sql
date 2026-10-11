-- TRINERGY MASTER v6.3 SAFE UPGRADE — run once in trinergy-qr-pilot
-- Non-destructive, includes guards from v6.1/v6.2.

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

alter table public.tqr_units add column if not exists faulted boolean not null default false;
alter table public.tqr_units add column if not exists faulted_at timestamptz;
alter table public.tqr_units add column if not exists parked boolean not null default false;
alter table public.tqr_units add column if not exists parked_at timestamptz;
alter table public.tqr_units add column if not exists parked_from_stage text;
alter table public.tqr_bays add column if not exists active boolean not null default true;

create table if not exists public.tqr_ui_assets(
  asset_key text primary key,
  public_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.tqr_ui_assets enable row level security;

create table if not exists public.tqr_weekly_targets(
 id uuid primary key default gen_random_uuid(),
 month_start date not null,
 week_no integer not null check(week_no between 1 and 5),
 ups_type text not null check(ups_type in ('3X','2X','STS')),
 target integer not null default 0,
 unique(month_start,week_no,ups_type)
);
alter table public.tqr_weekly_targets enable row level security;

insert into public.tqr_settings(setting_key,setting_value) values ('qr_next_number',1) on conflict(setting_key) do nothing;
create unique index if not exists tqr_engineers_name_ci_uq on public.tqr_engineers(lower(engineer_name));

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tqr_historical_months' and policyname='pilot historical all') then create policy "pilot historical all" on public.tqr_historical_months for all to anon using(true) with check(true); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tqr_ui_assets' and policyname='pilot ui assets all') then create policy "pilot ui assets all" on public.tqr_ui_assets for all to anon using(true) with check(true); end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tqr_weekly_targets' and policyname='pilot weekly all') then create policy "pilot weekly all" on public.tqr_weekly_targets for all to anon using(true) with check(true); end if;
end $$;

insert into storage.buckets(id,name,public) values ('tqr-assets','tqr-assets',true) on conflict(id) do update set public=true;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets read') then create policy "tqr assets read" on storage.objects for select to anon using(bucket_id='tqr-assets'); end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets insert') then create policy "tqr assets insert" on storage.objects for insert to anon with check(bucket_id='tqr-assets'); end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets update') then create policy "tqr assets update" on storage.objects for update to anon using(bucket_id='tqr-assets') with check(bucket_id='tqr-assets'); end if;
end $$;

do $$ begin
 begin alter publication supabase_realtime add table public.tqr_historical_months; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_ui_assets; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_weekly_targets; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_stage_state; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_units; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_bay_occupancy; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table public.tqr_stage_history; exception when duplicate_object then null; end;
end $$;
