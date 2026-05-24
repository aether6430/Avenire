ALTER TABLE "misconception"
ADD COLUMN IF NOT EXISTS "blocks" jsonb NOT NULL DEFAULT '{}'::jsonb;
