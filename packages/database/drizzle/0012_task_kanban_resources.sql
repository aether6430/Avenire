ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "resources" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "task"
SET "status" = CASE
  WHEN "status" = 'pending' THEN 'planned'
  WHEN "status" = 'in_progress' THEN 'drafting'
  WHEN "status" = 'completed' THEN 'completed'
  WHEN "status" = 'drafting' THEN 'drafting'
  WHEN "status" = 'polishing' THEN 'polishing'
  WHEN "status" = 'planned' THEN 'planned'
  ELSE 'planned'
END;

ALTER TABLE "task"
  ALTER COLUMN "status" SET DEFAULT 'planned';
