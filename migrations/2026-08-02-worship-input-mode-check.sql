-- Keep Worship element input_mode in sync with app-level praise input modes.
-- Older deployments only allowed praise_db/text/scripture/etc., which rejects
-- score_db, lyrics_db, and manual_praise rows during save.

alter table public.mindex_worship_elements
  drop constraint if exists mindex_worship_elements_input_mode_check;

alter table public.mindex_worship_elements
  add constraint mindex_worship_elements_input_mode_check
  check (input_mode in (
    '',
    'praise_db',
    'score_db',
    'lyrics_db',
    'manual_praise',
    'text',
    'scripture',
    'asset',
    'config',
    'none'
  ));
