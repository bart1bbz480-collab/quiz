-- ============================================================
-- Migratie 8: quiz_results filter op apparaat en sessie
-- Optionele params p_device_id en p_session_id.
-- Null = geen filter (alles tonen, gedrag onveranderd).
-- ============================================================

CREATE OR REPLACE FUNCTION public.quiz_results(
  quiz_id         uuid,
  include_aborted boolean DEFAULT false,
  p_device_id     text    DEFAULT NULL,
  p_session_id    integer DEFAULT NULL
)
RETURNS TABLE (
  question_id       uuid,
  question_position int,
  question_text_nl  text,
  option_id         uuid,
  option_position   int,
  option_label_nl   text,
  count             bigint,
  total_n           bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH valid_interviews AS (
    SELECT id FROM public.interviews
    WHERE interviews.quiz_id = quiz_results.quiz_id
      AND (status = 'completed' OR (quiz_results.include_aborted AND status = 'aborted'))
      AND (p_device_id  IS NULL OR device_id  = p_device_id)
      AND (p_session_id IS NULL OR session_id = p_session_id)
  ),
  option_counts AS (
    SELECT
      a.question_id,
      a.option_id,
      count(*) AS cnt
    FROM public.answers a
    WHERE a.interview_id IN (SELECT id FROM valid_interviews)
    GROUP BY a.question_id, a.option_id
  ),
  question_totals AS (
    SELECT
      question_id,
      sum(cnt) AS total_n
    FROM option_counts
    GROUP BY question_id
  )
  SELECT
    q.id               AS question_id,
    q.position         AS question_position,
    q.text_nl          AS question_text_nl,
    o.id               AS option_id,
    o.position         AS option_position,
    o.label_nl         AS option_label_nl,
    COALESCE(oc.cnt, 0) AS count,
    COALESCE(qt.total_n, 0) AS total_n
  FROM public.questions q
  JOIN public.options o ON o.question_id = q.id
  LEFT JOIN option_counts oc ON oc.question_id = q.id AND oc.option_id = o.id
  LEFT JOIN question_totals qt ON qt.question_id = q.id
  WHERE q.quiz_id = quiz_results.quiz_id
  ORDER BY q.position, o.position;
$$;

GRANT EXECUTE ON FUNCTION public.quiz_results(uuid, boolean, text, integer) TO authenticated;
