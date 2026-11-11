-- ============================================================
-- Migratie 3: Row Level Security
-- ============================================================

-- Hulpfuncties

create or replace function public.is_admin()
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_active_interviewer()
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.interviewer_sessions s
    join public.interviewers i on i.id = s.interviewer_id
    where s.user_id = (select auth.uid())
      and i.is_active = true
  );
$$;

-- ─── RLS activeren ────────────────────────────────────────────────────────────

alter table public.admins              enable row level security;
alter table public.app_settings        enable row level security;
alter table public.interviewers        enable row level security;
alter table public.interviewer_sessions enable row level security;
alter table public.quizzes             enable row level security;
alter table public.questions           enable row level security;
alter table public.options             enable row level security;
alter table public.interviews          enable row level security;
alter table public.answers             enable row level security;

-- ─── admins ──────────────────────────────────────────────────────────────────

create policy "admins: eigen rij lezen"
  on public.admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── app_settings ─────────────────────────────────────────────────────────────

create policy "app_settings: admin leest en schrijft"
  on public.app_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── interviewers ─────────────────────────────────────────────────────────────

create policy "interviewers: admin volledig"
  on public.interviewers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "interviewers: eigen rij lezen (interviewer)"
  on public.interviewers for select
  to authenticated
  using (
    id = (
      select interviewer_id from public.interviewer_sessions
      where user_id = (select auth.uid())
    )
  );

-- ─── interviewer_sessions ─────────────────────────────────────────────────────

create policy "interviewer_sessions: eigen rij lezen"
  on public.interviewer_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "interviewer_sessions: admin volledig"
  on public.interviewer_sessions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── quizzes ──────────────────────────────────────────────────────────────────

create policy "quizzes: admin volledig"
  on public.quizzes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Interviewers lezen de actieve quiz via RPC; directe toeGang wordt beheerd door de RPC.
-- Geen directe SELECT-policy voor interviewers op quizzes nodig.

-- ─── questions ────────────────────────────────────────────────────────────────

create policy "questions: admin volledig"
  on public.questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── options ──────────────────────────────────────────────────────────────────

create policy "options: admin volledig"
  on public.options for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── interviews ───────────────────────────────────────────────────────────────

create policy "interviews: admin volledig"
  on public.interviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Interviewers schrijven via RPC submit_interview (SECURITY DEFINER voor intern gebruik)
-- Geen directe INSERT-policy voor interviewers op interviews

-- ─── answers ──────────────────────────────────────────────────────────────────

create policy "answers: admin volledig"
  on public.answers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
