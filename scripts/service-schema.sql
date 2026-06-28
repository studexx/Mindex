-- Service module schema for Mindex
-- Run in Supabase SQL editor

-- ── 교육부서 교회력 ─────────────────────────────────────────────
create table if not exists public.mindex_sunday_calendar (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  liturgical text not null default '',
  note text not null default '',
  church_schedule text not null default '',
  preacher text not null default '',
  nursery_prayer text not null default '',
  children_prayer text not null default '',
  youth_prayer text not null default '',
  young_adult_prayer text not null default ''
);
create index if not exists mindex_sunday_calendar_date on public.mindex_sunday_calendar(date);

alter table public.mindex_sunday_calendar
  add column if not exists church_schedule text not null default '';

alter table public.mindex_sunday_calendar enable row level security;
drop policy if exists "mindex_sunday_calendar_read" on public.mindex_sunday_calendar;
create policy "mindex_sunday_calendar_read"
  on public.mindex_sunday_calendar for select to anon using (true);
drop policy if exists "mindex_sunday_calendar_write" on public.mindex_sunday_calendar;
create policy "mindex_sunday_calendar_write"
  on public.mindex_sunday_calendar for all to anon using (true) with check (true);

create table if not exists public.mindex_service_types (
  id text primary key,
  name text not null,
  sort_order int not null default 0,
  fixed_items jsonb not null default '[]',
  order_template jsonb not null default '[]'
);

alter table public.mindex_service_types
  add column if not exists order_template jsonb not null default '[]';

create table if not exists public.mindex_services (
  id uuid primary key default gen_random_uuid(),
  type_id text not null references public.mindex_service_types(id),
  date date not null,
  date_end date,        -- for date-range entries (e.g. youth "12/28–01/04")
  leader text,
  tags text[] not null default '{}',  -- e.g. ['온세대 찬양예배', '2·3부 통합']
  raw_text text,        -- original raw block, preserved
  created_at timestamptz not null default now()
);

create index if not exists mindex_services_type_date on public.mindex_services(type_id, date);

create table if not exists public.mindex_service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.mindex_services(id) on delete cascade,
  sort_order int not null,
  label text,           -- '2부 특송', '결단', '기도 1', '봉헌', '파송' … null = main song
  assignee text not null default '', -- order-sheet 담당 column
  raw_title text not null default '',
  song_id uuid,         -- references mindex_songs(id), nullable (unmatched stays raw)
  version_id text,      -- optional mindex_song_versions.id for exact presenter output
  memo text,            -- section notes, form hints, and optional presenter slide overrides
  created_at timestamptz not null default now()
);

create index if not exists mindex_service_items_service on public.mindex_service_items(service_id, sort_order);

alter table public.mindex_service_items
  add column if not exists assignee text not null default '';

alter table public.mindex_service_items
  alter column raw_title set default '';

alter table public.mindex_service_items
  add column if not exists version_id text;

alter table public.mindex_service_items
  add column if not exists memo text;

-- RLS: prototype collaboration via browser-safe anon key.
alter table public.mindex_service_types enable row level security;
alter table public.mindex_services enable row level security;
alter table public.mindex_service_items enable row level security;

drop policy if exists "anon read service_types" on public.mindex_service_types;
drop policy if exists "anon read services" on public.mindex_services;
drop policy if exists "anon read service_items" on public.mindex_service_items;
drop policy if exists "auth write service_types" on public.mindex_service_types;
drop policy if exists "auth write services" on public.mindex_services;
drop policy if exists "auth write service_items" on public.mindex_service_items;

drop policy if exists "mindex_service_types_shared_read" on public.mindex_service_types;
create policy "mindex_service_types_shared_read"
  on public.mindex_service_types
  for select
  to anon
  using (true);

drop policy if exists "mindex_service_types_shared_update" on public.mindex_service_types;
create policy "mindex_service_types_shared_update"
  on public.mindex_service_types
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "mindex_services_shared_read" on public.mindex_services;
create policy "mindex_services_shared_read"
  on public.mindex_services
  for select
  to anon
  using (true);

drop policy if exists "mindex_services_shared_insert" on public.mindex_services;
create policy "mindex_services_shared_insert"
  on public.mindex_services
  for insert
  to anon
  with check (true);

drop policy if exists "mindex_services_shared_update" on public.mindex_services;
create policy "mindex_services_shared_update"
  on public.mindex_services
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "mindex_services_shared_delete" on public.mindex_services;
create policy "mindex_services_shared_delete"
  on public.mindex_services
  for delete
  to anon
  using (true);

drop policy if exists "mindex_service_items_shared_read" on public.mindex_service_items;
create policy "mindex_service_items_shared_read"
  on public.mindex_service_items
  for select
  to anon
  using (true);

drop policy if exists "mindex_service_items_shared_insert" on public.mindex_service_items;
create policy "mindex_service_items_shared_insert"
  on public.mindex_service_items
  for insert
  to anon
  with check (true);

drop policy if exists "mindex_service_items_shared_update" on public.mindex_service_items;
create policy "mindex_service_items_shared_update"
  on public.mindex_service_items
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "mindex_service_items_shared_delete" on public.mindex_service_items;
create policy "mindex_service_items_shared_delete"
  on public.mindex_service_items
  for delete
  to anon
  using (true);
