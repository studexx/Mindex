-- Promote Worship element input/content state from config JSON to typed columns.
-- Safe to rerun.

alter table public.mindex_worship_elements
  add column if not exists input_mode text not null default '',
  add column if not exists content_state jsonb not null default '{}'::jsonb;

alter table public.mindex_worship_elements
  drop constraint if exists mindex_worship_elements_input_mode_check;

alter table public.mindex_worship_elements
  add constraint mindex_worship_elements_input_mode_check
  check (input_mode in ('', 'praise_db', 'score_db', 'lyrics_db', 'manual_praise', 'text', 'scripture', 'asset', 'config', 'none'));

update public.mindex_worship_elements
set
  input_mode = case
    when coalesce(
      nullif(config->>'inputMode', ''),
      nullif(config->>'input_mode', ''),
      nullif(config->'contentState'->>'inputMode', ''),
      nullif(config->'content_state'->>'input_mode', ''),
      ''
    ) in ('', 'praise_db', 'score_db', 'lyrics_db', 'manual_praise', 'text', 'scripture', 'asset', 'config', 'none')
      then coalesce(
        nullif(config->>'inputMode', ''),
        nullif(config->>'input_mode', ''),
        nullif(config->'contentState'->>'inputMode', ''),
        nullif(config->'content_state'->>'input_mode', ''),
        input_mode,
        ''
      )
    else input_mode
  end,
  content_state = case
    when config ? 'contentState' then config->'contentState'
    when config ? 'content_state' then config->'content_state'
    else content_state
  end
where
  coalesce(input_mode, '') = ''
  or content_state = '{}'::jsonb;

create index if not exists mindex_worship_elements_input_mode_idx
  on public.mindex_worship_elements (input_mode);
