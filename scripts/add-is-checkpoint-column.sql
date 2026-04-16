ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE checkpoints
SET is_checkpoint = TRUE
WHERE is_checkpoint IS NULL;