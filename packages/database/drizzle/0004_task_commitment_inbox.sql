ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "capture_state" text DEFAULT 'inbox' NOT NULL,
  ADD COLUMN IF NOT EXISTS "commitment_class" text,
  ADD COLUMN IF NOT EXISTS "scheduled_for" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "task_user_capture_idx" ON "task" ("user_id", "capture_state");
CREATE INDEX IF NOT EXISTS "task_user_commitment_idx" ON "task" ("user_id", "commitment_class");
CREATE INDEX IF NOT EXISTS "task_user_scheduled_idx" ON "task" ("user_id", "scheduled_for");
