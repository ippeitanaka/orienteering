CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.checkpoints
ADD COLUMN IF NOT EXISTS qr_token TEXT;

UPDATE public.checkpoints
SET qr_token = 'cp_' || REPLACE(gen_random_uuid()::text, '-', '')
WHERE qr_token IS NULL OR qr_token = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_qr_token
ON public.checkpoints(qr_token)
WHERE qr_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique_team_checkpoint
ON public.checkins(team_id, checkpoint_id);

CREATE OR REPLACE FUNCTION public.team_checkpoint_checkin(p_team_id INTEGER, p_checkpoint_id INTEGER)
RETURNS TABLE(
  success BOOLEAN,
  already_checked_in BOOLEAN,
  awarded_points INTEGER,
  total_score INTEGER,
  checkpoint_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_awarded_points INTEGER := 0;
  v_total_score INTEGER := 0;
  v_checkpoint_name TEXT := NULL;
BEGIN
  SELECT
    CASE
      WHEN point_value::text ~ '^-?[0-9]+$' THEN (point_value::text)::INTEGER
      ELSE 0
    END,
    name
  INTO v_awarded_points, v_checkpoint_name
  FROM public.checkpoints
  WHERE id = p_checkpoint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint not found';
  END IF;

  BEGIN
    INSERT INTO public.checkins (team_id, checkpoint_id)
    VALUES (p_team_id, p_checkpoint_id);
  EXCEPTION
    WHEN unique_violation THEN
      SELECT COALESCE(total_score, 0) INTO v_total_score FROM public.teams WHERE id = p_team_id;
      RETURN QUERY SELECT FALSE, TRUE, 0, v_total_score, v_checkpoint_name;
      RETURN;
  END;

  UPDATE public.teams
  SET total_score = COALESCE(total_score, 0) + v_awarded_points
  WHERE id = p_team_id
  RETURNING total_score INTO v_total_score;

  RETURN QUERY SELECT TRUE, FALSE, v_awarded_points, v_total_score, v_checkpoint_name;
END;
$$;