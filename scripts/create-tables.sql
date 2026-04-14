-- Orienteering App Database Schema
-- Run this script in Supabase SQL Editor to recreate all tables

-- 1. Teams table (チーム情報)
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  team_code TEXT UNIQUE
);

-- 2. Checkpoints table (チェックポイント情報)
CREATE TABLE IF NOT EXISTS checkpoints (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  point_value INTEGER DEFAULT 10,
  qr_token TEXT UNIQUE
);

-- 3. Checkins table (チェックイン記録)
CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  checkpoint_id INTEGER REFERENCES checkpoints(id) ON DELETE CASCADE,
  UNIQUE(team_id, checkpoint_id)
);

-- 4. Team locations table (チームの位置情報)
CREATE TABLE IF NOT EXISTS team_locations (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.5. Team location locks table (チーム位置共有ロック: 1チーム1端末)
CREATE TABLE IF NOT EXISTS team_location_locks (
  team_id INTEGER PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Timer settings table (タイマー設定)
CREATE TABLE IF NOT EXISTS timer_settings (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER NOT NULL DEFAULT 3600,
  end_time TIMESTAMP WITH TIME ZONE,
  is_running BOOLEAN DEFAULT FALSE
);

-- 6. Staff table (スタッフ情報)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  checkpoint_id INTEGER REFERENCES checkpoints(id) ON DELETE SET NULL
);

-- 7. Staff locations table (移動チェックポイント用スタッフ位置情報)
CREATE TABLE IF NOT EXISTS staff_locations (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  staff_id INTEGER UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_team_id ON checkins(team_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checkpoint_id ON checkins(checkpoint_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique_team_checkpoint ON checkins(team_id, checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_team_id ON team_locations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_location_locks_last_seen ON team_location_locks(last_seen);
CREATE INDEX IF NOT EXISTS idx_staff_checkpoint_id ON staff(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_qr_token ON checkpoints(qr_token) WHERE qr_token IS NOT NULL;

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
  FROM checkpoints
  WHERE id = p_checkpoint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint not found';
  END IF;

  BEGIN
    INSERT INTO checkins (team_id, checkpoint_id)
    VALUES (p_team_id, p_checkpoint_id);
  EXCEPTION
    WHEN unique_violation THEN
      SELECT COALESCE(total_score, 0) INTO v_total_score FROM teams WHERE id = p_team_id;
      RETURN QUERY SELECT FALSE, TRUE, 0, v_total_score, v_checkpoint_name;
      RETURN;
  END;

  UPDATE teams
  SET total_score = COALESCE(total_score, 0) + v_awarded_points
  WHERE id = p_team_id
  RETURNING total_score INTO v_total_score;

  RETURN QUERY SELECT TRUE, FALSE, v_awarded_points, v_total_score, v_checkpoint_name;
END;
$$;

-- Enable Row Level Security (RLS) - optional, can be customized later
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE timer_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
