-- Mindex performance indexes, 2026-08-07
-- Keep these aligned with the app's live query shapes.

-- Home/recent service loading orders by date first, then service type.
create index if not exists mindex_worship_services_date_type_idx
  on public.mindex_worship_services (service_date, service_type_id);

-- Presenter slide generation reads sections -> elements -> slides by service and sort order.
create index if not exists mindex_worship_sections_service_sort_id_idx
  on public.mindex_worship_sections (service_id, sort_order, id);

create index if not exists mindex_worship_elements_section_sort_id_idx
  on public.mindex_worship_elements (section_id, sort_order, id);

create index if not exists mindex_worship_slides_element_sort_id_idx
  on public.mindex_worship_slides (element_id, sort_order, id);

-- Scripture lookup is the largest table. Most app reads target active rows by
-- translation/book/chapter, then a verse or verse range.
create index if not exists mindex_bible_verses_active_lookup_idx
  on public.mindex_bible_verses (translation_id, book_code, chapter, verse)
  where is_active = true;

-- Praise hydration often starts from linked song ids and then resolves versions/units.
create index if not exists mindex_song_versions_canonical_order_idx
  on public.mindex_song_versions (canonical_song_id, version_order);

create index if not exists mindex_song_versions_source_order_idx
  on public.mindex_song_versions (source_song_id, version_order);

create index if not exists mindex_version_units_version_sort_id_idx
  on public.mindex_version_units (version_id, curated_order, unit_order, id);
