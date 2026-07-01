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
  young_adult_prayer text not null default '',
  youth_offering_prayer text not null default '',
  liturgical_color text not null default '',
  first_reading text not null default '',
  psalm text not null default '',
  second_reading text not null default '',
  gospel text not null default ''
);
create index if not exists mindex_sunday_calendar_date on public.mindex_sunday_calendar(date);

alter table public.mindex_sunday_calendar
  add column if not exists church_schedule text not null default '';

alter table public.mindex_sunday_calendar
  add column if not exists youth_offering_prayer text not null default '',
  add column if not exists liturgical_color text not null default '',
  add column if not exists first_reading text not null default '',
  add column if not exists psalm text not null default '',
  add column if not exists second_reading text not null default '',
  add column if not exists gospel text not null default '';

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
  title text,           -- optional one-off service name, e.g. 고난주간 특별새벽기도회
  leader text,
  tags text[] not null default '{}',  -- e.g. ['온세대 찬양예배', '2·3부 통합']
  raw_text text,        -- original raw block, preserved
  created_at timestamptz not null default now()
);

alter table public.mindex_services
  add column if not exists title text;

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

-- Stable read-only contract for YouTube live reservation automation.
-- GitHub Actions should call only this RPC instead of reading service tables.
create or replace function public.get_youtube_live_source(service_date date)
returns jsonb
language plpgsql
stable
as $$
declare
  v_service_date date := $1;
  v_service public.mindex_services%rowtype;
  v_service_count integer := 0;
  v_calendar public.mindex_sunday_calendar%rowtype;
  v_scripture_item public.mindex_service_items%rowtype;
  v_sermon_item public.mindex_service_items%rowtype;
  v_sermon_title text := '';
  v_passage text := '';
  v_sermon_assignee text := '';
  v_preacher text := '김남영 위임목사';
  v_preacher_source text := 'default_senior_pastor';
  v_assignee_key text := '';
  v_title_key text := '';
  v_missing jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
begin
  select count(*)
    into v_service_count
  from public.mindex_services s
  where s.type_id = 'sunday-main'
    and s.date = v_service_date;

  select *
    into v_service
  from public.mindex_services s
  where s.type_id = 'sunday-main'
    and s.date = v_service_date
  order by s.created_at asc
  limit 1;

  select *
    into v_calendar
  from public.mindex_sunday_calendar c
  where c.date = v_service_date
  limit 1;

  if v_service.id is not null then
    select *
      into v_scripture_item
    from public.mindex_service_items i
    where i.service_id = v_service.id
      and i.label = '성경봉독'
    order by i.sort_order asc
    limit 1;

    select *
      into v_sermon_item
    from public.mindex_service_items i
    where i.service_id = v_service.id
      and i.label = '설교'
    order by i.sort_order asc
    limit 1;
  end if;

  v_passage := btrim(regexp_replace(coalesce(v_scripture_item.raw_title, ''), '[[:space:]]+', ' ', 'g'));
  v_sermon_title := btrim(regexp_replace(coalesce(v_sermon_item.raw_title, ''), '[[:space:]]+', ' ', 'g'));
  v_sermon_assignee := btrim(regexp_replace(coalesce(v_sermon_item.assignee, ''), '[[:space:]]+', ' ', 'g'));

  if v_sermon_assignee <> '' then
    v_assignee_key := regexp_replace(lower(v_sermon_assignee), '[^0-9a-z가-힣]', '', 'g');
    v_title_key := regexp_replace(lower(v_sermon_title), '[^0-9a-z가-힣]', '', 'g');

    if v_sermon_assignee ~ '^[\"''“”‘’]'
      or (
        v_title_key <> ''
        and length(v_assignee_key) >= 2
        and (position(v_assignee_key in v_title_key) > 0 or position(v_title_key in v_assignee_key) > 0)
      )
    then
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'ignored_sermon_assignee',
        'value', v_sermon_assignee
      ));
    else
      v_preacher := v_sermon_assignee;
      v_preacher_source := 'sermon_assignee';
    end if;
  end if;

  if v_preacher = ''
    and btrim(regexp_replace(coalesce(v_service.leader, ''), '[[:space:]]+', ' ', 'g')) <> ''
  then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'ignored_service_leader_for_preacher',
      'value', btrim(regexp_replace(coalesce(v_service.leader, ''), '[[:space:]]+', ' ', 'g'))
    ));
  end if;

  if v_preacher = ''
    and btrim(regexp_replace(coalesce(v_calendar.preacher, ''), '[[:space:]]+', ' ', 'g')) <> ''
  then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'ignored_calendar_preacher_for_preacher',
      'value', btrim(regexp_replace(coalesce(v_calendar.preacher, ''), '[[:space:]]+', ' ', 'g'))
    ));
  end if;

  if v_service_count > 1 then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'multiple_services',
      'count', v_service_count
    ));
  end if;

  if v_service.id is null then
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'code', 'service_not_found'
    ));
  end if;
  if v_sermon_title = '' then
    v_missing := v_missing || jsonb_build_array('sermonTitle');
  end if;
  if v_passage = '' then
    v_missing := v_missing || jsonb_build_array('passage');
  end if;
  if v_preacher = '' then
    v_missing := v_missing || jsonb_build_array('preacher');
  end if;

  return jsonb_build_object(
    'serviceDate', v_service_date::text,
    'scheduledStartTime', v_service_date::text || 'T10:45:00+09:00',
    'sermonTitle', v_sermon_title,
    'passage', v_passage,
    'preacher', v_preacher,
    'preacherSource', v_preacher_source,
    'serviceId', v_service.id,
    'ready', jsonb_array_length(v_missing) = 0,
    'missing', v_missing,
    'warnings', v_warnings
  );
end;
$$;

grant execute on function public.get_youtube_live_source(date) to anon;
