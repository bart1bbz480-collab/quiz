-- ============================================================
-- Migratie 7: Device tracking + sessies per apparaat
-- Elk device krijgt een UUID (opgeslagen in localStorage).
-- Sessienummer verhogen = nieuwe teller, data blijft bewaard.
-- ============================================================

-- ─── Kolommen toevoegen aan interviews ────────────────────────────────────────

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS device_id  text,
  ADD COLUMN IF NOT EXISTS session_id integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_interviews_device_id ON public.interviews (device_id);

-- ─── submit_interview: device_id en session_id opslaan ───────────────────────

CREATE OR REPLACE FUNCTION public.submit_interview(payload json)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interviewer_id  uuid;
  v_quiz_exists     boolean;
  v_interview_id    uuid;
  v_status          text;
  v_answer          json;
BEGIN
  -- Interviewer ophalen via sessie (null = anonieme inzending, is toegestaan)
  SELECT interviewer_id INTO v_interviewer_id
  FROM public.interviewer_sessions
  WHERE user_id = auth.uid();

  -- Als er een interviewer_id is, controleer of die nog actief is
  IF v_interviewer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.interviewers
      WHERE id = v_interviewer_id AND is_active
    ) THEN
      RAISE EXCEPTION 'Interviewer is gedeactiveerd.';
    END IF;
  END IF;

  -- Quiz bestaat?
  SELECT EXISTS(
    SELECT 1 FROM public.quizzes
    WHERE id = (payload->>'quiz_id')::uuid
  ) INTO v_quiz_exists;

  IF NOT v_quiz_exists THEN
    RAISE EXCEPTION 'Vragenlijst niet gevonden.';
  END IF;

  v_interview_id := (payload->>'id')::uuid;
  v_status       := payload->>'status';

  -- Interview opslaan (idempotent)
  INSERT INTO public.interviews (
    id, quiz_id, interviewer_id, language, status,
    aborted_at_position, started_at, ended_at,
    app_version, user_agent,
    device_id, session_id
  ) VALUES (
    v_interview_id,
    (payload->>'quiz_id')::uuid,
    v_interviewer_id,
    payload->>'language',
    v_status,
    (payload->>'aborted_at_position')::int,
    (payload->>'started_at')::timestamptz,
    (payload->>'ended_at')::timestamptz,
    payload->>'app_version',
    payload->>'user_agent',
    payload->>'device_id',
    COALESCE((payload->>'session_id')::int, 1)
  )
  ON CONFLICT (id) DO NOTHING;

  IF found THEN
    FOR v_answer IN SELECT * FROM json_array_elements(payload->'answers')
    LOOP
      INSERT INTO public.answers (interview_id, question_id, option_id)
      VALUES (
        v_interview_id,
        (v_answer->>'question_id')::uuid,
        (v_answer->>'option_id')::uuid
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

    UPDATE public.quizzes
    SET is_locked = true
    WHERE id = (payload->>'quiz_id')::uuid
      AND is_locked = false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_interview(json) TO anon, authenticated;
