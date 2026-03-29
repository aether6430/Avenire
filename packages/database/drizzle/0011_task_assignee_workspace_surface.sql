ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "assignee_user_id" text;

DO $$ BEGIN
  ALTER TABLE "task"
    ADD CONSTRAINT "task_assignee_user_id_user_id_fk"
    FOREIGN KEY ("assignee_user_id")
    REFERENCES "public"."user"("id")
    ON DELETE set null
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

UPDATE "task"
SET "assignee_user_id" = "user_id"
WHERE "assignee_user_id" IS NULL;

CREATE INDEX IF NOT EXISTS "task_workspace_assignee_status_idx"
  ON "task" ("workspace_id", "assignee_user_id", "status");

CREATE INDEX IF NOT EXISTS "task_workspace_due_status_idx"
  ON "task" ("workspace_id", "due_at", "status");
