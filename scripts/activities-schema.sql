-- Activities module schema for Mindex.
-- Reusable rec/quiz/team-game data that can run standalone or be inserted into Worship services.

create extension if not exists pgcrypto;

create table if not exists public.mindex_activity_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date,
  status text not null default 'draft',
  location text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mindex_activity_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mindex_activity_events(id) on delete cascade,
  name text not null,
  color text not null default '#6ee7b7',
  score integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mindex_activity_games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mindex_activity_events(id) on delete cascade,
  title text not null,
  game_type text not null check (game_type in ('puzzle_hunt', 'quiz', 'physical')),
  status text not null default 'draft',
  sort_order integer not null default 0,
  owner text,
  location text,
  supplies text,
  memo text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mindex_activity_score_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mindex_activity_events(id) on delete cascade,
  game_id uuid references public.mindex_activity_games(id) on delete set null,
  team_id uuid references public.mindex_activity_teams(id) on delete set null,
  points integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.mindex_activity_puzzle_boards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.mindex_activity_games(id) on delete cascade,
  title text,
  rows integer not null default 1,
  cols integer not null default 1,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mindex_activity_puzzle_pieces (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.mindex_activity_puzzle_boards(id) on delete cascade,
  label text,
  row_no integer not null default 1,
  col_no integer not null default 1,
  found boolean not null default false,
  found_by_team_id uuid references public.mindex_activity_teams(id) on delete set null,
  found_at timestamptz,
  points integer not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.mindex_activity_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.mindex_activity_games(id) on delete cascade,
  question_type text not null check (question_type in ('ox', 'multiple_choice', 'short_answer', 'motion')),
  prompt text not null,
  answer text,
  points integer not null default 1,
  sort_order integer not null default 0,
  memo text
);

create table if not exists public.mindex_activity_quiz_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.mindex_activity_quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.mindex_activity_physical_games (
  game_id uuid primary key references public.mindex_activity_games(id) on delete cascade,
  duration_seconds integer,
  scoring_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mindex_activity_games_event_idx
  on public.mindex_activity_games(event_id, sort_order);

create index if not exists mindex_activity_teams_event_idx
  on public.mindex_activity_teams(event_id, sort_order);

create index if not exists mindex_activity_score_events_event_idx
  on public.mindex_activity_score_events(event_id, created_at desc);

create index if not exists mindex_activity_puzzle_pieces_board_idx
  on public.mindex_activity_puzzle_pieces(board_id, sort_order);

create index if not exists mindex_activity_quiz_questions_game_idx
  on public.mindex_activity_quiz_questions(game_id, sort_order);

create index if not exists mindex_activity_quiz_choices_question_idx
  on public.mindex_activity_quiz_choices(question_id, sort_order);

alter table public.mindex_activity_events enable row level security;
alter table public.mindex_activity_teams enable row level security;
alter table public.mindex_activity_games enable row level security;
alter table public.mindex_activity_score_events enable row level security;
alter table public.mindex_activity_puzzle_boards enable row level security;
alter table public.mindex_activity_puzzle_pieces enable row level security;
alter table public.mindex_activity_quiz_questions enable row level security;
alter table public.mindex_activity_quiz_choices enable row level security;
alter table public.mindex_activity_physical_games enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mindex_activity_events',
    'mindex_activity_teams',
    'mindex_activity_games',
    'mindex_activity_score_events',
    'mindex_activity_puzzle_boards',
    'mindex_activity_puzzle_pieces',
    'mindex_activity_quiz_questions',
    'mindex_activity_quiz_choices',
    'mindex_activity_physical_games'
  ]
  loop
    execute format('drop policy if exists "%s_shared_read" on public.%I', table_name, table_name);
    execute format('create policy "%s_shared_read" on public.%I for select using (true)', table_name, table_name);

    execute format('drop policy if exists "%s_shared_insert" on public.%I', table_name, table_name);
    execute format('create policy "%s_shared_insert" on public.%I for insert with check (true)', table_name, table_name);

    execute format('drop policy if exists "%s_shared_update" on public.%I', table_name, table_name);
    execute format('create policy "%s_shared_update" on public.%I for update using (true) with check (true)', table_name, table_name);

    execute format('drop policy if exists "%s_shared_delete" on public.%I', table_name, table_name);
    execute format('create policy "%s_shared_delete" on public.%I for delete using (true)', table_name, table_name);
  end loop;
end $$;
