drop trigger if exists trg_set_mindex_songs_title_normalized
on public.mindex_songs;

drop function if exists public.set_mindex_songs_title_normalized();

drop index if exists public.mindex_songs_title_normalized_idx;

alter table public.mindex_songs
drop column if exists title_normalized;

alter table public.mindex_songs
drop column if exists corrected_section_name,
drop column if exists parse_warning,
drop column if exists correction_note,
drop column if exists category,
drop column if exists source,
drop column if exists default_key,
drop column if exists tempo_note,
drop column if exists theme_tags;
