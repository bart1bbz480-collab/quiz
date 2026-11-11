-- ============================================================
-- Migratie 1: Initieel schema
-- Straatinterview Quiz App
-- ============================================================

-- Zorg dat pgcrypto beschikbaar is voor bcrypt
create extension if not exists pgcrypto;

-- ─── Tabellen ─────────────────────────────────────────────────────────────────

-- Admins (koppeling met Supabase Auth)
create table public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- Globale instellingen (één rij)
create table public.app_settings (
  id               int primary key default 1 check (id = 1),
  access_code_hash text not null,
  updated_at       timestamptz not null default now()
);

-- Interviewers
create table public.interviewers (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null,
  first_name_key text not null unique,   -- lower(trim(first_name))
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Koppeling anonieme Supabase-sessie aan interviewer
create table public.interviewer_sessions (
  user_id        uuid primary key references auth.users on delete cascade,
  interviewer_id uuid not null references public.interviewers on delete cascade,
  created_at     timestamptz not null default now()
);

-- Vragenlijsten
create table public.quizzes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  version          int not null default 1,
  parent_quiz_id   uuid references public.quizzes,
  status           text not null check (status in ('draft','active','archived')) default 'draft',
  is_locked        boolean not null default false,
  campaign_url     text,
  thanks_text_nl   text,
  thanks_text_fr   text,
  thanks_text_en   text,
  thanks_image_path text,
  include_aborted  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Maximaal één actieve vragenlijst tegelijk
create unique index one_active_quiz on public.quizzes ((true)) where status = 'active';

-- Vragen
create table public.questions (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references public.quizzes on delete cascade,
  position   int not null,
  type       text not null check (type in ('multiple_choice','yes_no_unknown')),
  text_nl    text not null,
  text_fr    text,
  text_en    text,
  image_path text,
  unique (quiz_id, position)
);

-- Antwoordopties
create table public.options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions on delete cascade,
  position    int not null,
  label_nl    text not null,
  label_fr    text,
  label_en    text,
  image_path  text,
  unique (question_id, position)
);

-- Afgenomen enquêtes
create table public.interviews (
  id                   uuid primary key,
  quiz_id              uuid not null references public.quizzes,
  interviewer_id       uuid not null references public.interviewers,
  language             text not null check (language in ('nl','fr','en')),
  status               text not null check (status in ('completed','aborted')),
  aborted_at_position  int,
  started_at           timestamptz not null,
  ended_at             timestamptz not null,
  synced_at            timestamptz not null default now(),
  app_version          text,
  user_agent           text
);

-- Antwoorden
create table public.answers (
  interview_id uuid not null references public.interviews on delete cascade,
  question_id  uuid not null references public.questions,
  option_id    uuid not null references public.options,
  primary key (interview_id, question_id)
);

-- ─── Indexen ──────────────────────────────────────────────────────────────────

create index idx_interviews_quiz_id       on public.interviews (quiz_id);
create index idx_interviews_interviewer   on public.interviews (interviewer_id);
create index idx_interviews_status        on public.interviews (status);
create index idx_answers_interview_id     on public.answers (interview_id);
create index idx_questions_quiz_id        on public.questions (quiz_id);
create index idx_options_question_id      on public.options (question_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quizzes_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();
