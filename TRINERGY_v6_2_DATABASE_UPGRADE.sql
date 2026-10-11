-- TRINERGY v6.2 SAFE UPGRADE — run once in trinergy-qr-pilot
-- Non-destructive.

alter table public.tqr_units add column if not exists faulted boolean not null default false;
alter table public.tqr_units add column if not exists faulted_at timestamptz;

create table if not exists public.tqr_ui_assets(
  asset_key text primary key,
  public_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.tqr_ui_assets enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tqr_ui_assets' and policyname='pilot ui assets all') then
  create policy "pilot ui assets all" on public.tqr_ui_assets for all to anon using(true) with check(true);
 end if;
end $$;

insert into storage.buckets(id,name,public)
values ('tqr-assets','tqr-assets',true)
on conflict(id) do update set public=true;

do $$ begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets read') then
  create policy "tqr assets read" on storage.objects for select to anon using(bucket_id='tqr-assets');
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets insert') then
  create policy "tqr assets insert" on storage.objects for insert to anon with check(bucket_id='tqr-assets');
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tqr assets update') then
  create policy "tqr assets update" on storage.objects for update to anon using(bucket_id='tqr-assets') with check(bucket_id='tqr-assets');
 end if;
end $$;

do $$ begin
 begin alter publication supabase_realtime add table public.tqr_ui_assets; exception when duplicate_object then null; end;
end $$;
