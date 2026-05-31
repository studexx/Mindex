drop trigger if exists trg_set_mindex_songs_title_normalized
on public.mindex_songs;

drop function if exists public.set_mindex_songs_title_normalized();

drop index if exists public.mindex_songs_title_normalized_idx;

alter table public.mindex_songs
drop column if exists title_normalized;
