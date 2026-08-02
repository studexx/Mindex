-- Prune unused Bible translations to reduce mindex_bible_verses storage/index weight.
-- Run from Supabase SQL Editor or with a service-role/database connection.
--
-- Backed up locally before pruning:
--   /Users/parkjihun/Code/Mindex/backups/bible-translation-prune-full-20260802-102547
--
-- Keep by request: kjv, niv, rsv.
-- Keep all Korean translations.
-- Delete only these unused foreign translations:
--   asv, darby, nas, nkjv, nrs, rewebst, shinkaiyaku_3rd, webster

begin;

create temporary table prune_bible_translation_keys (
  translation_key text primary key
) on commit drop;

insert into prune_bible_translation_keys (translation_key)
values
  ('asv'),
  ('darby'),
  ('nas'),
  ('nkjv'),
  ('nrs'),
  ('rewebst'),
  ('shinkaiyaku_3rd'),
  ('webster');

-- Preview expected verse rows before delete.
select
  t.translation_key,
  t.name,
  t.abbreviation,
  count(v.id) as verse_rows
from public.mindex_bible_translations t
join prune_bible_translation_keys p
  on p.translation_key = t.translation_key
left join public.mindex_bible_verses v
  on v.translation_id = t.id
group by t.translation_key, t.name, t.abbreviation
order by t.translation_key;

-- Deleting translations cascades to mindex_bible_verses through the FK.
delete from public.mindex_bible_translations t
using prune_bible_translation_keys p
where t.translation_key = p.translation_key;

-- Verify KJV/NIV/RSV and Korean translations remain available.
select
  translation_key,
  name,
  abbreviation,
  is_active
from public.mindex_bible_translations
where translation_key in (
  'kjv',
  'niv',
  'rsv',
  '개역개정',
  '개역한글',
  '공동번역',
  '바른성경',
  '쉬운성경',
  '우리말',
  '표준새번역',
  '한글kjv',
  '현대어',
  '현대인'
)
order by name;

commit;

-- Optional after commit, if SQL Editor permits it:
-- analyze public.mindex_bible_translations;
-- analyze public.mindex_bible_verses;
