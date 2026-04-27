CREATE TABLE IF NOT EXISTS team_map_settings (
  id INTEGER PRIMARY KEY,
  team_location_auto_update_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  team_location_update_interval_seconds INTEGER NOT NULL DEFAULT 180,
  team_map_auto_refresh_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  team_map_refresh_interval_seconds INTEGER NOT NULL DEFAULT 180,
  team_scoreboard_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO team_map_settings (
  id,
  team_location_auto_update_enabled,
  team_location_update_interval_seconds,
  team_map_auto_refresh_enabled,
  team_map_refresh_interval_seconds,
  team_scoreboard_visible
)
VALUES (1, TRUE, 180, TRUE, 180, TRUE)
ON CONFLICT (id) DO NOTHING;