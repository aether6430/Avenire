CREATE TABLE IF NOT EXISTS "teaching_artifact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "teaching_artifact_kind_check" CHECK ("kind" IN ('mission', 'resource', 'note', 'reference', 'lesson', 'learning-record')),
  CONSTRAINT "teaching_artifact_content_length_check" CHECK (length("content") <= 100000)
);
CREATE UNIQUE INDEX IF NOT EXISTS "teaching_artifact_owner_slug_uidx"
  ON "teaching_artifact" ("user_id", "workspace_id", "kind", "slug");
CREATE INDEX IF NOT EXISTS "teaching_artifact_owner_kind_idx"
  ON "teaching_artifact" ("user_id", "workspace_id", "kind", "updated_at");
