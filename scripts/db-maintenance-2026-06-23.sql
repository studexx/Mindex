-- Mindex DB maintenance, 2026-06-23
-- Safe core changes only: schema drift fixes, indexes, and ordered views.
-- This file intentionally does not delete song/version/lyric data.

-- 1) Schema drift fixes used by the current app.
alter table public.mindex_song_versions
  add column if not exists praise_types text[] not null default '{}';

-- 2) Keep blank residue normalized, without touching real content.
update public.mindex_songs
set memo = null
where memo is not null
  and btrim(memo) in ('', '{}');

-- 3) Practical indexes for the app's current access patterns.
create index if not exists mindex_songs_praise_types_gin_idx
  on public.mindex_songs using gin (praise_types);

create index if not exists mindex_songs_original_title_idx
  on public.mindex_songs (original_title);

create index if not exists mindex_song_versions_source_order_idx
  on public.mindex_song_versions (source_song_id, version_order);

create index if not exists mindex_song_versions_canonical_order_idx
  on public.mindex_song_versions (canonical_song_id, version_order);

create index if not exists mindex_version_units_canonical_order_idx
  on public.mindex_version_units (canonical_song_id, curated_order, unit_order);

create index if not exists mindex_bible_verses_translation_book_chapter_idx
  on public.mindex_bible_verses (translation_id, book_code, chapter);

-- Optional but recommended if Scripture text search feels slow.
-- This index uses some storage, but it keeps ilike text search responsive.
create extension if not exists pg_trgm;

create index if not exists mindex_bible_verses_text_trgm_idx
  on public.mindex_bible_verses using gin (text gin_trgm_ops)
  where is_active = true;

-- 4) Ordered views for Supabase table browsing.
-- PostgreSQL cannot safely reorder physical columns in-place; use views instead.
create or replace view public.mindex_songs_ordered as
select
  id,
  title,
  subtitle,
  original_title,
  hymn_no,
  praise_types,
  artist,
  lyricist,
  composer,
  translator,
  album,
  track,
  scripture_refs,
  memo
from public.mindex_songs;

create or replace view public.mindex_song_versions_ordered as
select
  id,
  canonical_song_id,
  source_song_id,
  version_order,
  curated_version_name,
  version_label,
  is_primary,
  praise_types,
  subtitle,
  original_title,
  hymn_no,
  version_review_status,
  deck_key,
  raw_section_name,
  lyric_signature,
  source_count,
  created_at
from public.mindex_song_versions;
