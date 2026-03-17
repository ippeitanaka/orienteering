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
  point_value INTEGER DEFAULT 10
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_team_id ON checkins(team_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checkpoint_id ON checkins(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_team_id ON team_locations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_location_locks_last_seen ON team_location_locks(last_seen);
CREATE INDEX IF NOT EXISTS idx_staff_checkpoint_id ON staff(checkpoint_id);

-- Enable Row Level Security (RLS) - optional, can be customized later
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE timer_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
