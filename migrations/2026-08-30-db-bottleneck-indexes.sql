-- Mindex DB bottleneck indexes, 2026-08-30
-- Keep this migration focused on live read/write query shapes not covered by
-- the earlier worship performance indexes.

-- Calendar loads filter from the configured minimum date and then order by date.
create index if not exists mindex_sunday_calendar_date_idx
  on public.mindex_sunday_calendar (date);

-- Bible fallback text search uses ILIKE on the largest table when the RPC is not
-- available. Trigram search keeps that fallback usable for live lookup.
create extension if not exists pg_trgm;

create index if not exists mindex_bible_verses_active_text_trgm_idx
  on public.mindex_bible_verses using gin (text gin_trgm_ops)
  where is_active = true;

-- Song relation hydration reads all "related" rows ordered by source/related.
-- The existing source/related indexes help point lookups and saves; this one
-- matches the catalog hydration filter.
create index if not exists mindex_song_relations_type_source_related_idx
  on public.mindex_song_relations (relation_type, source_song_id, related_song_id);
