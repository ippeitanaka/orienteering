-- タイマーテーブルの作成
CREATE TABLE IF NOT EXISTS timer (
  id SERIAL PRIMARY KEY,
  duration INTEGER NOT NULL DEFAULT 3600, -- デフォルト1時間（秒単位）
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, running, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 既存のレコードを確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM timer WHERE id = 1) THEN
    -- 初期レコードの挿入
    INSERT INTO timer (id, duration, status)
    VALUES (1, 3600, 'not_started');
  END IF;
END $$;
