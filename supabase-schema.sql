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

create table if not exists public.mindex_scripture_books (
  code text primary key,
  sort_order integer not null unique,
  testament text not null,
  division text not null,
  korean_name text not null,
  english_name text not null,
  short_name text not null,
  aliases text[] not null default '{}',
  is_active boolean not null default true
);

insert into public.mindex_scripture_books
  (code, sort_order, testament, division, korean_name, english_name, short_name, aliases)
values
  ('GEN', 1, 'Old Testament', 'Pentateuch', '창세기', 'Genesis', '창', array['Genesis','창']),
  ('EXO', 2, 'Old Testament', 'Pentateuch', '출애굽기', 'Exodus', '출', array['Exodus','출']),
  ('LEV', 3, 'Old Testament', 'Pentateuch', '레위기', 'Leviticus', '레', array['Leviticus','레']),
  ('NUM', 4, 'Old Testament', 'Pentateuch', '민수기', 'Numbers', '민', array['Numbers','민']),
  ('DEU', 5, 'Old Testament', 'Pentateuch', '신명기', 'Deuteronomy', '신', array['Deuteronomy','신']),
  ('JOS', 6, 'Old Testament', 'History', '여호수아', 'Joshua', '수', array['Joshua','수']),
  ('JDG', 7, 'Old Testament', 'History', '사사기', 'Judges', '삿', array['Judges','삿']),
  ('RUT', 8, 'Old Testament', 'History', '룻기', 'Ruth', '룻', array['Ruth','룻']),
  ('1SA', 9, 'Old Testament', 'History', '사무엘상', '1 Samuel', '삼상', array['1 Samuel','삼상']),
  ('2SA', 10, 'Old Testament', 'History', '사무엘하', '2 Samuel', '삼하', array['2 Samuel','삼하']),
  ('1KI', 11, 'Old Testament', 'History', '열왕기상', '1 Kings', '왕상', array['1 Kings','왕상']),
  ('2KI', 12, 'Old Testament', 'History', '열왕기하', '2 Kings', '왕하', array['2 Kings','왕하']),
  ('1CH', 13, 'Old Testament', 'History', '역대상', '1 Chronicles', '대상', array['1 Chronicles','대상']),
  ('2CH', 14, 'Old Testament', 'History', '역대하', '2 Chronicles', '대하', array['2 Chronicles','대하']),
  ('EZR', 15, 'Old Testament', 'History', '에스라', 'Ezra', '스', array['Ezra','스']),
  ('NEH', 16, 'Old Testament', 'History', '느헤미야', 'Nehemiah', '느', array['Nehemiah','느']),
  ('EST', 17, 'Old Testament', 'History', '에스더', 'Esther', '에', array['Esther','에']),
  ('JOB', 18, 'Old Testament', 'Wisdom', '욥기', 'Job', '욥', array['Job','욥']),
  ('PSA', 19, 'Old Testament', 'Wisdom', '시편', 'Psalms', '시', array['Psalms','Psalm','시']),
  ('PRO', 20, 'Old Testament', 'Wisdom', '잠언', 'Proverbs', '잠', array['Proverbs','잠']),
  ('ECC', 21, 'Old Testament', 'Wisdom', '전도서', 'Ecclesiastes', '전', array['Ecclesiastes','전']),
  ('SNG', 22, 'Old Testament', 'Wisdom', '아가', 'Song of Songs', '아', array['Song of Songs','Song of Solomon','아']),
  ('ISA', 23, 'Old Testament', 'Major Prophets', '이사야', 'Isaiah', '사', array['Isaiah','사']),
  ('JER', 24, 'Old Testament', 'Major Prophets', '예레미야', 'Jeremiah', '렘', array['Jeremiah','렘']),
  ('LAM', 25, 'Old Testament', 'Major Prophets', '예레미야애가', 'Lamentations', '애', array['Lamentations','애']),
  ('EZK', 26, 'Old Testament', 'Major Prophets', '에스겔', 'Ezekiel', '겔', array['Ezekiel','겔']),
  ('DAN', 27, 'Old Testament', 'Major Prophets', '다니엘', 'Daniel', '단', array['Daniel','단']),
  ('HOS', 28, 'Old Testament', 'Minor Prophets', '호세아', 'Hosea', '호', array['Hosea','호']),
  ('JOL', 29, 'Old Testament', 'Minor Prophets', '요엘', 'Joel', '욜', array['Joel','욜']),
  ('AMO', 30, 'Old Testament', 'Minor Prophets', '아모스', 'Amos', '암', array['Amos','암']),
  ('OBA', 31, 'Old Testament', 'Minor Prophets', '오바댜', 'Obadiah', '옵', array['Obadiah','옵']),
  ('JON', 32, 'Old Testament', 'Minor Prophets', '요나', 'Jonah', '욘', array['Jonah','욘']),
  ('MIC', 33, 'Old Testament', 'Minor Prophets', '미가', 'Micah', '미', array['Micah','미']),
  ('NAM', 34, 'Old Testament', 'Minor Prophets', '나훔', 'Nahum', '나', array['Nahum','나']),
  ('HAB', 35, 'Old Testament', 'Minor Prophets', '하박국', 'Habakkuk', '합', array['Habakkuk','합']),
  ('ZEP', 36, 'Old Testament', 'Minor Prophets', '스바냐', 'Zephaniah', '습', array['Zephaniah','습']),
  ('HAG', 37, 'Old Testament', 'Minor Prophets', '학개', 'Haggai', '학', array['Haggai','학']),
  ('ZEC', 38, 'Old Testament', 'Minor Prophets', '스가랴', 'Zechariah', '슥', array['Zechariah','슥']),
  ('MAL', 39, 'Old Testament', 'Minor Prophets', '말라기', 'Malachi', '말', array['Malachi','말']),
  ('MAT', 40, 'New Testament', 'Gospels', '마태복음', 'Matthew', '마', array['Matthew','마']),
  ('MRK', 41, 'New Testament', 'Gospels', '마가복음', 'Mark', '막', array['Mark','막']),
  ('LUK', 42, 'New Testament', 'Gospels', '누가복음', 'Luke', '눅', array['Luke','눅']),
  ('JHN', 43, 'New Testament', 'Gospels', '요한복음', 'John', '요', array['John','요']),
  ('ACT', 44, 'New Testament', 'History', '사도행전', 'Acts', '행', array['Acts','행']),
  ('ROM', 45, 'New Testament', 'Pauline Epistles', '로마서', 'Romans', '롬', array['Romans','롬']),
  ('1CO', 46, 'New Testament', 'Pauline Epistles', '고린도전서', '1 Corinthians', '고전', array['1 Corinthians','고전']),
  ('2CO', 47, 'New Testament', 'Pauline Epistles', '고린도후서', '2 Corinthians', '고후', array['2 Corinthians','고후']),
  ('GAL', 48, 'New Testament', 'Pauline Epistles', '갈라디아서', 'Galatians', '갈', array['Galatians','갈']),
  ('EPH', 49, 'New Testament', 'Pauline Epistles', '에베소서', 'Ephesians', '엡', array['Ephesians','엡']),
  ('PHP', 50, 'New Testament', 'Pauline Epistles', '빌립보서', 'Philippians', '빌', array['Philippians','빌']),
  ('COL', 51, 'New Testament', 'Pauline Epistles', '골로새서', 'Colossians', '골', array['Colossians','골']),
  ('1TH', 52, 'New Testament', 'Pauline Epistles', '데살로니가전서', '1 Thessalonians', '살전', array['1 Thessalonians','살전']),
  ('2TH', 53, 'New Testament', 'Pauline Epistles', '데살로니가후서', '2 Thessalonians', '살후', array['2 Thessalonians','살후']),
  ('1TI', 54, 'New Testament', 'Pauline Epistles', '디모데전서', '1 Timothy', '딤전', array['1 Timothy','딤전']),
  ('2TI', 55, 'New Testament', 'Pauline Epistles', '디모데후서', '2 Timothy', '딤후', array['2 Timothy','딤후']),
  ('TIT', 56, 'New Testament', 'Pauline Epistles', '디도서', 'Titus', '딛', array['Titus','딛']),
  ('PHM', 57, 'New Testament', 'Pauline Epistles', '빌레몬서', 'Philemon', '몬', array['Philemon','몬']),
  ('HEB', 58, 'New Testament', 'General Epistles', '히브리서', 'Hebrews', '히', array['Hebrews','히']),
  ('JAS', 59, 'New Testament', 'General Epistles', '야고보서', 'James', '약', array['James','약']),
  ('1PE', 60, 'New Testament', 'General Epistles', '베드로전서', '1 Peter', '벧전', array['1 Peter','벧전']),
  ('2PE', 61, 'New Testament', 'General Epistles', '베드로후서', '2 Peter', '벧후', array['2 Peter','벧후']),
  ('1JN', 62, 'New Testament', 'General Epistles', '요한일서', '1 John', '요일', array['1 John','요일']),
  ('2JN', 63, 'New Testament', 'General Epistles', '요한이서', '2 John', '요이', array['2 John','요이']),
  ('3JN', 64, 'New Testament', 'General Epistles', '요한삼서', '3 John', '요삼', array['3 John','요삼']),
  ('JUD', 65, 'New Testament', 'General Epistles', '유다서', 'Jude', '유', array['Jude','유']),
  ('REV', 66, 'New Testament', 'Apocalypse', '요한계시록', 'Revelation', '계', array['Revelation','계'])
on conflict (code) do update set
  sort_order = excluded.sort_order,
  testament = excluded.testament,
  division = excluded.division,
  korean_name = excluded.korean_name,
  english_name = excluded.english_name,
  short_name = excluded.short_name,
  aliases = excluded.aliases,
  is_active = excluded.is_active;

create table if not exists public.mindex_scriptures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  book_code text references public.mindex_scripture_books (code),
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

alter table public.mindex_scriptures
  add column if not exists book_code text;

do $$
begin
  alter table public.mindex_scriptures
    add constraint mindex_scriptures_book_code_fkey
    foreign key (book_code)
    references public.mindex_scripture_books (code);
exception
  when duplicate_object then null;
end $$;

create index if not exists mindex_scriptures_book_idx
  on public.mindex_scriptures (book);

create index if not exists mindex_scriptures_book_code_idx
  on public.mindex_scriptures (book_code);

-- Prototype collaboration policies.
-- Use only with a browser-safe anon key and a project intended for shared editing.
alter table public.mindex_songs enable row level security;
alter table public.mindex_scripture_books enable row level security;
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

drop policy if exists "mindex_scripture_books_shared_read" on public.mindex_scripture_books;
create policy "mindex_scripture_books_shared_read"
  on public.mindex_scripture_books
  for select
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
