-- Promote song-to-song relationships out of mindex_songs.memo.related_song_ids.
-- Run in Supabase SQL Editor, then backfill with
-- python3 scripts/backfill_song_relations_from_memo.py --apply

create table if not exists public.mindex_song_relations (
  id uuid primary key default gen_random_uuid(),
  source_song_id uuid not null references public.mindex_songs(id) on delete cascade,
  related_song_id uuid not null references public.mindex_songs(id) on delete cascade,
  relation_type text not null default 'related',
  note text not null default '',
  created_at timestamptz not null default now(),
  check (source_song_id <> related_song_id),
  unique (source_song_id, related_song_id, relation_type)
);

create index if not exists mindex_song_relations_source_idx
  on public.mindex_song_relations (source_song_id, relation_type, related_song_id);

create index if not exists mindex_song_relations_related_idx
  on public.mindex_song_relations (related_song_id, relation_type, source_song_id);

alter table public.mindex_song_relations enable row level security;

grant select, insert, update, delete on public.mindex_song_relations to anon, authenticated;

drop policy if exists "mindex_song_relations_shared_read" on public.mindex_song_relations;
create policy "mindex_song_relations_shared_read"
  on public.mindex_song_relations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "mindex_song_relations_shared_insert" on public.mindex_song_relations;
create policy "mindex_song_relations_shared_insert"
  on public.mindex_song_relations
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "mindex_song_relations_shared_update" on public.mindex_song_relations;
create policy "mindex_song_relations_shared_update"
  on public.mindex_song_relations
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "mindex_song_relations_shared_delete" on public.mindex_song_relations;
create policy "mindex_song_relations_shared_delete"
  on public.mindex_song_relations
  for delete
  to anon, authenticated
  using (true);
