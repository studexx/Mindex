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
  canonical_english_title text not null default '',
  short_name text not null,
  aliases text[] not null default '{}',
  jewish_category text not null default '',
  author text not null default '',
  is_active boolean not null default true
);

alter table public.mindex_scripture_books
  add column if not exists canonical_english_title text not null default '';

alter table public.mindex_scripture_books
  add column if not exists jewish_category text not null default '';

alter table public.mindex_scripture_books
  add column if not exists author text not null default '';
insert into public.mindex_scripture_books
  (code, sort_order, testament, division, korean_name, english_name, canonical_english_title, short_name, aliases, jewish_category, author)
values
  ('GEN', 1, 'Old Testament', 'Pentateuch', '창세기', 'Genesis', 'Book of Genesis', '창', array['Genesis','창','Book of Genesis'], 'Torah', 'Moses'),
  ('EXO', 2, 'Old Testament', 'Pentateuch', '출애굽기', 'Exodus', 'Book of Exodus', '출', array['Exodus','출','Book of Exodus'], 'Torah', 'Moses'),
  ('LEV', 3, 'Old Testament', 'Pentateuch', '레위기', 'Leviticus', 'Book of Leviticus', '레', array['Leviticus','레','Book of Leviticus'], 'Torah', 'Moses'),
  ('NUM', 4, 'Old Testament', 'Pentateuch', '민수기', 'Numbers', 'Book of Numbers', '민', array['Numbers','민','Book of Numbers'], 'Torah', 'Moses'),
  ('DEU', 5, 'Old Testament', 'Pentateuch', '신명기', 'Deuteronomy', 'Book of Deuteronomy', '신', array['Deuteronomy','신','Book of Deuteronomy'], 'Torah', 'Moses'),
  ('JOS', 6, 'Old Testament', 'Historical Books', '여호수아', 'Joshua', 'Book of Joshua', '수', array['Joshua','수','Book of Joshua'], 'Former Prophets, Nevi’im', 'Joshua'),
  ('JDG', 7, 'Old Testament', 'Historical Books', '사사기', 'Judges', 'Book of Judges', '삿', array['Judges','삿','Book of Judges'], 'Former Prophets, Nevi’im', 'Samuel'),
  ('RUT', 8, 'Old Testament', 'Historical Books', '룻기', 'Ruth', 'Book of Ruth', '룻', array['Ruth','룻','Book of Ruth'], 'Five Megillot, Ketuvim', 'Samuel'),
  ('1SA', 9, 'Old Testament', 'Historical Books', '사무엘상', '1 Samuel', 'Books of Samuel', '삼상', array['1 Samuel','삼상','Books of Samuel'], 'Former Prophets, Nevi’im', 'Samuel'),
  ('2SA', 10, 'Old Testament', 'Historical Books', '사무엘하', '2 Samuel', 'Books of Samuel', '삼하', array['2 Samuel','삼하','Books of Samuel'], 'Former Prophets, Nevi’im', 'Samuel'),
  ('1KI', 11, 'Old Testament', 'Historical Books', '열왕기상', '1 Kings', 'Books of Kings', '왕상', array['1 Kings','왕상','Books of Kings'], 'Former Prophets, Nevi’im', 'Jeremiah'),
  ('2KI', 12, 'Old Testament', 'Historical Books', '열왕기하', '2 Kings', 'Books of Kings', '왕하', array['2 Kings','왕하','Books of Kings'], 'Former Prophets, Nevi’im', 'Jeremiah'),
  ('1CH', 13, 'Old Testament', 'Historical Books', '역대상', '1 Chronicles', 'Books of Chronicles', '대상', array['1 Chronicles','대상','Books of Chronicles'], 'Historical Books, Ketuvim', 'Chronicler, Jeremiah'),
  ('2CH', 14, 'Old Testament', 'Historical Books', '역대하', '2 Chronicles', 'Books of Chronicles', '대하', array['2 Chronicles','대하','Books of Chronicles'], 'Historical Books, Ketuvim', 'Chronicler, Jeremiah'),
  ('EZR', 15, 'Old Testament', 'Historical Books', '에스라', 'Ezra', 'Book of Ezra', '스', array['Ezra','스','Book of Ezra'], 'Historical Books, Ketuvim', 'Chronicler, Ezra'),
  ('NEH', 16, 'Old Testament', 'Historical Books', '느헤미야', 'Nehemiah', 'Book of Nehemiah', '느', array['Nehemiah','느','Book of Nehemiah'], 'Historical Books, Ketuvim', 'Chronicler, Nehemiah'),
  ('EST', 17, 'Old Testament', 'Historical Books', '에스더', 'Esther', 'Book of Esther', '에', array['Esther','에','Book of Esther'], 'Five Megillot, Ketuvim', '?'),
  ('JOB', 18, 'Old Testament', 'Poetic Books', '욥기', 'Job', 'Book of Job', '욥', array['Job','욥','Book of Job'], 'Ketuvim, Poetic Books', '?'),
  ('PSA', 19, 'Old Testament', 'Poetic Books', '시편', 'Psalms', 'Book of Psalms', '시', array['Psalms','시','Book of Psalms','Psalm'], 'Ketuvim, Poetic Books', 'David'),
  ('PRO', 20, 'Old Testament', 'Poetic Books', '잠언', 'Proverbs', 'Book of Proverbs', '잠', array['Proverbs','잠','Book of Proverbs'], 'Ketuvim, Poetic Books', 'Solomon'),
  ('ECC', 21, 'Old Testament', 'Poetic Books', '전도서', 'Ecclesiastes', 'Ecclesiastes', '전', array['Ecclesiastes','전','Ecclesiastes'], 'Five Megillot, Ketuvim', 'Solomon'),
  ('SNG', 22, 'Old Testament', 'Poetic Books', '아가', 'Song of Songs', 'Song of Songs', '아', array['Song of Songs','아','Song of Songs','Song of Solomon'], 'Five Megillot, Ketuvim', 'Solomon'),
  ('ISA', 23, 'Old Testament', 'Major Prophets, Prophetic Books', '이사야', 'Isaiah', 'Book of Isaiah', '사', array['Isaiah','사','Book of Isaiah'], 'Latter Prophets, Nevi’im', 'Isaiah'),
  ('JER', 24, 'Old Testament', 'Major Prophets, Prophetic Books', '예레미야', 'Jeremiah', 'Book of Jeremiah', '렘', array['Jeremiah','렘','Book of Jeremiah'], 'Latter Prophets, Nevi’im', 'Jeremiah'),
  ('LAM', 25, 'Old Testament', 'Major Prophets, Prophetic Books', '예레미야애가', 'Lamentations', 'Book of Lamentations', '애', array['Lamentations','애','Book of Lamentations'], 'Five Megillot, Ketuvim', 'Jeremiah'),
  ('EZK', 26, 'Old Testament', 'Major Prophets, Prophetic Books', '에스겔', 'Ezekiel', 'Book of Ezekiel', '겔', array['Ezekiel','겔','Book of Ezekiel'], 'Latter Prophets, Nevi’im', 'Ezekiel'),
  ('DAN', 27, 'Old Testament', 'Major Prophets, Prophetic Books', '다니엘', 'Daniel', 'Book of Daniel', '단', array['Daniel','단','Book of Daniel'], 'Historical Books, Ketuvim', 'Daniel'),
  ('HOS', 28, 'Old Testament', 'Minor Prophets, Prophetic Books', '호세아', 'Hosea', 'Book of Hosea', '호', array['Hosea','호','Book of Hosea'], 'Latter Prophets, Nevi’im, Trei Asar', 'Hosea'),
  ('JOL', 29, 'Old Testament', 'Minor Prophets, Prophetic Books', '요엘', 'Joel', 'Book of Joel', '욜', array['Joel','욜','Book of Joel'], 'Latter Prophets, Nevi’im, Trei Asar', 'Joel'),
  ('AMO', 30, 'Old Testament', 'Minor Prophets, Prophetic Books', '아모스', 'Amos', 'Book of Amos', '암', array['Amos','암','Book of Amos'], 'Latter Prophets, Nevi’im, Trei Asar', 'Amos'),
  ('OBA', 31, 'Old Testament', 'Minor Prophets, Prophetic Books', '오바댜', 'Obadiah', 'Book of Obadiah', '옵', array['Obadiah','옵','Book of Obadiah'], 'Latter Prophets, Nevi’im, Trei Asar', 'Obadiah'),
  ('JON', 32, 'Old Testament', 'Minor Prophets, Prophetic Books', '요나', 'Jonah', 'Book of Jonah', '욘', array['Jonah','욘','Book of Jonah'], 'Latter Prophets, Nevi’im, Trei Asar', 'Jonah'),
  ('MIC', 33, 'Old Testament', 'Minor Prophets, Prophetic Books', '미가', 'Micah', 'Book of Micah', '미', array['Micah','미','Book of Micah'], 'Latter Prophets, Nevi’im, Trei Asar', 'Micah'),
  ('NAM', 34, 'Old Testament', 'Minor Prophets, Prophetic Books', '나훔', 'Nahum', 'Book of Nahum', '나', array['Nahum','나','Book of Nahum'], 'Latter Prophets, Nevi’im, Trei Asar', 'Nahum'),
  ('HAB', 35, 'Old Testament', 'Minor Prophets, Prophetic Books', '하박국', 'Habakkuk', 'Book of Habakkuk', '합', array['Habakkuk','합','Book of Habakkuk'], 'Latter Prophets, Nevi’im, Trei Asar', 'Habakkuk'),
  ('ZEP', 36, 'Old Testament', 'Minor Prophets, Prophetic Books', '스바냐', 'Zephaniah', 'Book of Zephaniah', '습', array['Zephaniah','습','Book of Zephaniah'], 'Latter Prophets, Nevi’im, Trei Asar', 'Zephaniah'),
  ('HAG', 37, 'Old Testament', 'Minor Prophets, Prophetic Books', '학개', 'Haggai', 'Book of Haggai', '학', array['Haggai','학','Book of Haggai'], 'Latter Prophets, Nevi’im, Trei Asar', 'Haggai'),
  ('ZEC', 38, 'Old Testament', 'Minor Prophets, Prophetic Books', '스가랴', 'Zechariah', 'Book of Zechariah', '슥', array['Zechariah','슥','Book of Zechariah'], 'Latter Prophets, Nevi’im, Trei Asar', 'Zechariah'),
  ('MAL', 39, 'Old Testament', 'Minor Prophets, Prophetic Books', '말라기', 'Malachi', 'Book of Malachi', '말', array['Malachi','말','Book of Malachi'], 'Latter Prophets, Nevi’im, Trei Asar', 'Malachi'),
  ('MAT', 40, 'New Testament', 'Gospels', '마태복음', 'Matthew', 'Gospel of Matthew', '마', array['Matthew','마','Gospel of Matthew'], '', 'Matthew'),
  ('MRK', 41, 'New Testament', 'Gospels', '마가복음', 'Mark', 'Gospel of Mark', '막', array['Mark','막','Gospel of Mark'], '', 'Mark'),
  ('LUK', 42, 'New Testament', 'Gospels', '누가복음', 'Luke', 'Gospel of Luke', '눅', array['Luke','눅','Gospel of Luke'], '', 'Luke'),
  ('JHN', 43, 'New Testament', 'Gospels', '요한복음', 'John', 'Gospel of John', '요', array['John','요','Gospel of John'], '', 'John'),
  ('ACT', 44, 'New Testament', 'Acts', '사도행전', 'Acts', 'Acts of the Apostles', '행', array['Acts','행','Acts of the Apostles'], '', 'Luke'),
  ('ROM', 45, 'New Testament', 'Pauline Epistles', '로마서', 'Romans', 'Epistle to the Romans', '롬', array['Romans','롬','Epistle to the Romans'], '', 'Paul'),
  ('1CO', 46, 'New Testament', 'Pauline Epistles', '고린도전서', '1 Corinthians', 'Epistles to the Corinthians', '고전', array['1 Corinthians','고전','Epistles to the Corinthians'], '', 'Paul'),
  ('2CO', 47, 'New Testament', 'Pauline Epistles', '고린도후서', '2 Corinthians', 'Epistles to the Corinthians', '고후', array['2 Corinthians','고후','Epistles to the Corinthians'], '', 'Paul'),
  ('GAL', 48, 'New Testament', 'Pauline Epistles', '갈라디아서', 'Galatians', 'Epistle to the Galatians', '갈', array['Galatians','갈','Epistle to the Galatians'], '', 'Paul'),
  ('EPH', 49, 'New Testament', 'Pauline Epistles', '에베소서', 'Ephesians', 'Epistle to the Ephesians', '엡', array['Ephesians','엡','Epistle to the Ephesians'], '', 'Paul'),
  ('PHP', 50, 'New Testament', 'Pauline Epistles', '빌립보서', 'Philippians', 'Epistle to the Philippians', '빌', array['Philippians','빌','Epistle to the Philippians'], '', 'Paul'),
  ('COL', 51, 'New Testament', 'Pauline Epistles', '골로새서', 'Colossians', 'Epistle to the Colossians', '골', array['Colossians','골','Epistle to the Colossians'], '', 'Paul'),
  ('1TH', 52, 'New Testament', 'Pauline Epistles', '데살로니가전서', '1 Thessalonians', 'Epistles to the Thessalonians', '살전', array['1 Thessalonians','살전','Epistles to the Thessalonians'], '', 'Paul'),
  ('2TH', 53, 'New Testament', 'Pauline Epistles', '데살로니가후서', '2 Thessalonians', 'Epistles to the Thessalonians', '살후', array['2 Thessalonians','살후','Epistles to the Thessalonians'], '', 'Paul'),
  ('1TI', 54, 'New Testament', 'Pauline Epistles', '디모데전서', '1 Timothy', 'Epistles to Timothy', '딤전', array['1 Timothy','딤전','Epistles to Timothy'], '', 'Paul'),
  ('2TI', 55, 'New Testament', 'Pauline Epistles', '디모데후서', '2 Timothy', 'Epistles to Timothy', '딤후', array['2 Timothy','딤후','Epistles to Timothy'], '', 'Paul'),
  ('TIT', 56, 'New Testament', 'Pauline Epistles', '디도서', 'Titus', 'Epistle to Titus', '딛', array['Titus','딛','Epistle to Titus'], '', 'Paul'),
  ('PHM', 57, 'New Testament', 'Pauline Epistles', '빌레몬서', 'Philemon', 'Epistle to Philemon', '몬', array['Philemon','몬','Epistle to Philemon'], '', 'Paul'),
  ('HEB', 58, 'New Testament', 'Pauline Epistles', '히브리서', 'Hebrews', 'Epistle to the Hebrews', '히', array['Hebrews','히','Epistle to the Hebrews'], '', '?'),
  ('JAS', 59, 'New Testament', 'Catholic Epistles', '야고보서', 'James', 'Epistle of James', '약', array['James','약','Epistle of James'], '', 'James'),
  ('1PE', 60, 'New Testament', 'Catholic Epistles', '베드로전서', '1 Peter', 'Epistles of Peter', '벧전', array['1 Peter','벧전','Epistles of Peter'], '', 'Peter'),
  ('2PE', 61, 'New Testament', 'Catholic Epistles', '베드로후서', '2 Peter', 'Epistles of Peter', '벧후', array['2 Peter','벧후','Epistles of Peter'], '', 'Peter'),
  ('1JN', 62, 'New Testament', 'Catholic Epistles', '요한일서', '1 John', 'Epistles of John', '요일', array['1 John','요일','Epistles of John'], '', 'John'),
  ('2JN', 63, 'New Testament', 'Catholic Epistles', '요한이서', '2 John', 'Epistles of John', '요이', array['2 John','요이','Epistles of John'], '', 'John'),
  ('3JN', 64, 'New Testament', 'Catholic Epistles', '요한삼서', '3 John', 'Epistles of John', '요삼', array['3 John','요삼','Epistles of John'], '', 'John'),
  ('JUD', 65, 'New Testament', 'Catholic Epistles', '유다서', 'Jude', 'Epistle of Jude', '유', array['Jude','유','Epistle of Jude'], '', 'Jude'),
  ('REV', 66, 'New Testament', 'Apocalypse', '요한계시록', 'Revelation', 'Book of Revelation', '계', array['Revelation','계','Book of Revelation'], '', 'John')
on conflict (code) do update set
  sort_order = excluded.sort_order,
  testament = excluded.testament,
  division = excluded.division,
  korean_name = excluded.korean_name,
  english_name = excluded.english_name,
  canonical_english_title = excluded.canonical_english_title,
  short_name = excluded.short_name,
  aliases = excluded.aliases,
  jewish_category = excluded.jewish_category,
  author = excluded.author,
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
