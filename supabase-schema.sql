create extension if not exists pgcrypto;

create table if not exists public.mindex_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_titles text[] not null default '{}',
  hymn_no text,
  memo text,
  is_active boolean not null default true
);

create index if not exists mindex_songs_title_idx
  on public.mindex_songs (title);

create index if not exists mindex_songs_hymn_no_idx
  on public.mindex_songs (hymn_no);

create table if not exists public.mindex_scriptures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  book text not null default '',
  reference text not null default '',
  translation text not null default '',
  text text not null default '',
  memo text,
  is_active boolean not null default true
);

create index if not exists mindex_scriptures_title_idx
  on public.mindex_scriptures (title);

create index if not exists mindex_scriptures_reference_idx
  on public.mindex_scriptures (reference);

alter table public.mindex_scriptures
  add column if not exists book text not null default '';

create index if not exists mindex_scriptures_book_idx
  on public.mindex_scriptures (book);

-- Prototype collaboration policies.
-- Use only with a browser-safe anon key and a project intended for shared editing.
alter table public.mindex_songs enable row level security;
alter table public.mindex_scriptures enable row level security;

drop policy if exists "mindex_songs_shared_read" on public.mindex_songs;
create policy "mindex_songs_shared_read"
  on public.mindex_songs
  for select
  to anon
  using (true);

drop policy if exists "mindex_songs_shared_insert" on public.mindex_songs;
create policy "mindex_songs_shared_insert"
  on public.mindex_songs
  for insert
  to anon
  with check (true);

drop policy if exists "mindex_songs_shared_update" on public.mindex_songs;
create policy "mindex_songs_shared_update"
  on public.mindex_songs
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "mindex_songs_shared_delete" on public.mindex_songs;
create policy "mindex_songs_shared_delete"
  on public.mindex_songs
  for delete
  to anon
  using (true);

drop policy if exists "mindex_scriptures_shared_read" on public.mindex_scriptures;
create policy "mindex_scriptures_shared_read"
  on public.mindex_scriptures
  for select
  to anon
  using (true);

drop policy if exists "mindex_scriptures_shared_insert" on public.mindex_scriptures;
create policy "mindex_scriptures_shared_insert"
  on public.mindex_scriptures
  for insert
  to anon
  with check (true);

drop policy if exists "mindex_scriptures_shared_update" on public.mindex_scriptures;
create policy "mindex_scriptures_shared_update"
  on public.mindex_scriptures
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "mindex_scriptures_shared_delete" on public.mindex_scriptures;
create policy "mindex_scriptures_shared_delete"
  on public.mindex_scriptures
  for delete
  to anon
  using (true);
