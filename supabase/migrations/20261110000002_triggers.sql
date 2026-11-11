-- ============================================================
-- Migratie 2: Triggers voor validatie en vergrendeling
-- ============================================================

-- ─── Max. 10 vragen per quiz ──────────────────────────────────────────────────

create or replace function public.check_max_questions()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.questions
  where quiz_id = new.quiz_id;

  if v_count >= 10 then
    raise exception 'Een vragenlijst mag maximaal 10 vragen bevatten.';
  end if;

  return new;
end;
$$;

create trigger enforce_max_questions
  before insert on public.questions
  for each row execute function public.check_max_questions();

-- ─── Max. 5 / min. 2 opties bij multiple_choice ──────────────────────────────

create or replace function public.check_option_count()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_type    text;
  v_count   int;
begin
  select type into v_type from public.questions where id = new.question_id;

  if v_type = 'yes_no_unknown' then
    return new; -- vaste 3 opties, geen controle nodig
  end if;

  select count(*) into v_count
  from public.options
  where question_id = new.question_id;

  if v_count >= 5 then
    raise exception 'Een meerkeuze-vraag mag maximaal 5 antwoordopties hebben.';
  end if;

  return new;
end;
$$;

create trigger enforce_max_options
  before insert on public.options
  for each row execute function public.check_option_count();

-- ─── Vergrendeling: geen wijzigingen aan locked quiz ─────────────────────────

create or replace function public.check_quiz_not_locked()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_locked boolean;
  v_quiz_id uuid;
begin
  -- Bepaal het quiz_id op basis van de tabel
  if tg_table_name = 'questions' then
    v_quiz_id := coalesce(new.quiz_id, old.quiz_id);
  elsif tg_table_name = 'options' then
    select quiz_id into v_quiz_id
    from public.questions
    where id = coalesce(new.question_id, old.question_id);
  end if;

  select is_locked into v_locked from public.quizzes where id = v_quiz_id;

  if v_locked then
    raise exception 'Deze vragenlijst is vergrendeld en kan niet meer gewijzigd worden.';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger questions_check_locked
  before insert or update or delete on public.questions
  for each row execute function public.check_quiz_not_locked();

create trigger options_check_locked
  before insert or update or delete on public.options
  for each row execute function public.check_quiz_not_locked();
