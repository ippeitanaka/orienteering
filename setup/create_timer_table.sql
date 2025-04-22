-- タイマー設定テーブルの作成
CREATE TABLE IF NOT EXISTS timer_settings (
  id SERIAL PRIMARY KEY,
  duration INTEGER NOT NULL DEFAULT 0,
  end_time TIMESTAMP WITH TIME ZONE,
  is_running BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データの挿入
INSERT INTO timer_settings (duration, is_running)
VALUES (3600, FALSE)
ON CONFLICT DO NOTHING;

-- リアルタイム更新のための設定
ALTER TABLE timer_settings REPLICA IDENTITY FULL;
