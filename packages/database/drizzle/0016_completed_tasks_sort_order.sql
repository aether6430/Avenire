ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "completed_tasks_at_top" boolean NOT NULL DEFAULT true;
