-- ============================================================
-- Migratie 4: RPC-functies
-- ============================================================

-- ─── register_interviewer ─────────────────────────────────────────────────────
-- Controleert de code, maakt of vindt de interviewer, koppelt auth.uid().
-- Toegankelijk voor anonieme gebruikers (na anonymous sign-in).

create or replace function public.register_interviewer(
  p_first_name text,
  p_code       text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash          text;
  v_key           text;
  v_interviewer   public.interviewers%rowtype;
  v_uid           uuid;
begin
  -- Ophalen van de hash
  select access_code_hash into v_hash from public.app_settings where id = 1;

  if v_hash is null then
    raise exception 'Geen toegangscode ingesteld. Neem contact op met de admin.';
  end if;

  -- Code controleren (bcrypt)
  if not (crypt(p_code, v_hash) = v_hash) then
    raise exception 'Ongeldige toegangscode.';
  end if;

  -- Voornaam normaliseren
  v_key := lower(trim(p_first_name));
  if length(v_key) = 0 then
    raise exception 'Voornaam mag niet leeg zijn.';
  end if;

  -- Interviewer aanmaken of bestaande vinden
  insert into public.interviewers (first_name, first_name_key)
  values (trim(p_first_name), v_key)
  on conflict (first_name_key) do update
    set first_name = excluded.first_name  -- update naam niet, behoud origineel
  returning * into v_interviewer;

  -- Als interviewer inactief is, login weigeren
  if not v_interviewer.is_active then
    raise exception 'Dit account is gedeactiveerd. Neem contact op met de admin.';
  end if;

  -- Supabase-sessie koppelen aan interviewer
  v_uid := auth.uid();

  insert into public.interviewer_sessions (user_id, interviewer_id)
  values (v_uid, v_interviewer.id)
  on conflict (user_id) do update
    set interviewer_id = excluded.interviewer_id;

  return row_to_json(v_interviewer);
end;
$$;

-- Toegang verlenen aan geanonimiseerde gebruikers
grant execute on function public.register_interviewer(text, text) to authenticated, anon;

-- ─── get_active_quiz ─────────────────────────────────────────────────────────
-- Geeft de actieve quiz terug met alle vragen en opties.
-- Alleen voor actieve interviewers.

create or replace function public.get_active_quiz()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz json;
begin
  -- Toegangscontrole
  if not public.is_active_interviewer() and not public.is_admin() then
    raise exception 'Geen toegang.';
  end if;

  select row_to_json(q) into v_quiz
  from (
    select
      qz.*,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', qu.id,
              'quiz_id', qu.quiz_id,
              'position', qu.position,
              'type', qu.type,
              'text_nl', qu.text_nl,
              'text_fr', qu.text_fr,
              'text_en', qu.text_en,
              'image_path', qu.image_path,
              'options', (
                select coalesce(json_agg(
                  json_build_object(
                    'id', o.id,
                    'question_id', o.question_id,
                    'position', o.position,
                    'label_nl', o.label_nl,
                    'label_fr', o.label_fr,
                    'label_en', o.label_en,
                    'image_path', o.image_path
                  ) order by o.position
                ), '[]'::json)
                from public.options o
                where o.question_id = qu.id
              )
            ) order by qu.position
          )
          from public.questions qu
          where qu.quiz_id = qz.id
        ),
        '[]'::json
      ) as questions
    from public.quizzes qz
    where qz.status = 'active'
    limit 1
  ) q;

  return v_quiz;
end;
$$;

grant execute on function public.get_active_quiz() to authenticated, anon;

-- ─── submit_interview ────────────────────────────────────────────────────────
-- Slaat een enquête + antwoorden op in één transactie.
-- Idempotent: on conflict do nothing.

create or replace function public.submit_interview(payload json)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interviewer_id  uuid;
  v_quiz_exists     boolean;
  v_interviewer_ok  boolean;
  v_interview_id    uuid;
  v_status          text;
  v_answer          json;
begin
  -- Interviewer ophalen via sessie
  select interviewer_id into v_interviewer_id
  from public.interviewer_sessions
  where user_id = auth.uid();

  if v_interviewer_id is null then
    raise exception 'Niet ingelogd als interviewer.';
  end if;

  -- Interviewer actief?
  select is_active into v_interviewer_ok
  from public.interviewers
  where id = v_interviewer_id;

  if not v_interviewer_ok then
    raise exception 'Interviewer is gedeactiveerd.';
  end if;

  -- Quiz bestaat?
  select exists(
    select 1 from public.quizzes
    where id = (payload->>'quiz_id')::uuid
  ) into v_quiz_exists;

  if not v_quiz_exists then
    raise exception 'Vragenlijst niet gevonden.';
  end if;

  v_interview_id := (payload->>'id')::uuid;
  v_status       := payload->>'status';

  -- Interview opslaan (idempotent)
  insert into public.interviews (
    id, quiz_id, interviewer_id, language, status,
    aborted_at_position, started_at, ended_at,
    app_version, user_agent
  ) values (
    v_interview_id,
    (payload->>'quiz_id')::uuid,
    v_interviewer_id,
    payload->>'language',
    v_status,
    (payload->>'aborted_at_position')::int,
    (payload->>'started_at')::timestamptz,
    (payload->>'ended_at')::timestamptz,
    payload->>'app_version',
    payload->>'user_agent'
  )
  on conflict (id) do nothing;

  -- Alleen antwoorden opslaan als de rij nieuw was
  if found then
    -- Antwoorden opslaan
    for v_answer in select * from json_array_elements(payload->'answers')
    loop
      insert into public.answers (interview_id, question_id, option_id)
      values (
        v_interview_id,
        (v_answer->>'question_id')::uuid,
        (v_answer->>'option_id')::uuid
      )
      on conflict do nothing;
    end loop;

    -- Quiz vergrendelen
    update public.quizzes
    set is_locked = true
    where id = (payload->>'quiz_id')::uuid
      and is_locked = false;
  end if;
end;
$$;

grant execute on function public.submit_interview(json) to authenticated;

-- ─── activate_quiz ───────────────────────────────────────────────────────────

create or replace function public.activate_quiz(p_quiz_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Geen toegang.';
  end if;

  -- Validatie: minstens 1 geldige vraag
  if not exists (
    select 1 from public.questions where quiz_id = p_quiz_id
  ) then
    raise exception 'De vragenlijst heeft geen vragen.';
  end if;

  -- Huidige actieve archiveren
  update public.quizzes
  set status = 'archived', updated_at = now()
  where status = 'active';

  -- Nieuwe activeren
  update public.quizzes
  set status = 'active', updated_at = now()
  where id = p_quiz_id;
end;
$$;

grant execute on function public.activate_quiz(uuid) to authenticated;

-- ─── set_access_code ─────────────────────────────────────────────────────────

create or replace function public.set_access_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Geen toegang.';
  end if;

  if length(p_code) < 6 then
    raise exception 'Code moet minimaal 6 tekens zijn.';
  end if;

  insert into public.app_settings (id, access_code_hash)
  values (1, crypt(p_code, gen_salt('bf')))
  on conflict (id) do update
    set access_code_hash = crypt(p_code, gen_salt('bf')),
        updated_at = now();
end;
$$;

grant execute on function public.set_access_code(text) to authenticated;

-- ─── duplicate_quiz ──────────────────────────────────────────────────────────

create or replace function public.duplicate_quiz(p_quiz_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_quiz_id uuid;
  v_new_q_id    uuid;
  v_question    record;
  v_option      record;
  v_max_version int;
begin
  if not public.is_admin() then
    raise exception 'Geen toegang.';
  end if;

  -- Versienummer bepalen
  select coalesce(max(version), 0) into v_max_version
  from public.quizzes
  where id = p_quiz_id or parent_quiz_id = p_quiz_id;

  -- Quiz kopiëren
  insert into public.quizzes (
    title, version, parent_quiz_id, status,
    campaign_url, thanks_text_nl, thanks_text_fr, thanks_text_en,
    thanks_image_path, include_aborted
  )
  select
    title, v_max_version + 1, p_quiz_id, 'draft',
    campaign_url, thanks_text_nl, thanks_text_fr, thanks_text_en,
    thanks_image_path, include_aborted
  from public.quizzes
  where id = p_quiz_id
  returning id into v_new_quiz_id;

  -- Vragen kopiëren
  for v_question in
    select * from public.questions where quiz_id = p_quiz_id order by position
  loop
    insert into public.questions (
      quiz_id, position, type,
      text_nl, text_fr, text_en, image_path
    ) values (
      v_new_quiz_id, v_question.position, v_question.type,
      v_question.text_nl, v_question.text_fr, v_question.text_en, v_question.image_path
    ) returning id into v_new_q_id;

    -- Opties kopiëren
    for v_option in
      select * from public.options where question_id = v_question.id order by position
    loop
      insert into public.options (
        question_id, position,
        label_nl, label_fr, label_en, image_path
      ) values (
        v_new_q_id, v_option.position,
        v_option.label_nl, v_option.label_fr, v_option.label_en, v_option.image_path
      );
    end loop;
  end loop;

  return v_new_quiz_id;
end;
$$;

grant execute on function public.duplicate_quiz(uuid) to authenticated;

-- ─── quiz_results ─────────────────────────────────────────────────────────────

create or replace function public.quiz_results(
  quiz_id         uuid,
  include_aborted boolean default false
)
returns table (
  question_id       uuid,
  question_position int,
  question_text_nl  text,
  option_id         uuid,
  option_position   int,
  option_label_nl   text,
  count             bigint,
  total_n           bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with valid_interviews as (
    select id from public.interviews
    where quiz_id = quiz_results.quiz_id
      and (status = 'completed' or (quiz_results.include_aborted and status = 'aborted'))
  ),
  option_counts as (
    select
      a.question_id,
      a.option_id,
      count(*) as cnt
    from public.answers a
    where a.interview_id in (select id from valid_interviews)
    group by a.question_id, a.option_id
  ),
  question_totals as (
    select
      question_id,
      sum(cnt) as total_n
    from option_counts
    group by question_id
  )
  select
    q.id               as question_id,
    q.position         as question_position,
    q.text_nl          as question_text_nl,
    o.id               as option_id,
    o.position         as option_position,
    o.label_nl         as option_label_nl,
    coalesce(oc.cnt, 0) as count,
    coalesce(qt.total_n, 0) as total_n
  from public.questions q
  join public.options o on o.question_id = q.id
  left join option_counts oc on oc.question_id = q.id and oc.option_id = o.id
  left join question_totals qt on qt.question_id = q.id
  where q.quiz_id = quiz_results.quiz_id
  order by q.position, o.position;
$$;

grant execute on function public.quiz_results(uuid, boolean) to authenticated;
