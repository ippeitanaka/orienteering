ALTER TABLE public.team_map_settings
ADD COLUMN IF NOT EXISTS team_scoreboard_visible BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.team_map_settings
SET team_scoreboard_visible = TRUE
WHERE team_scoreboard_visible IS NULL;