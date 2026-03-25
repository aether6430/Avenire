ALTER TABLE "note_content" DROP COLUMN IF EXISTS "yjs_state";
ALTER TABLE "note_content" ADD COLUMN IF NOT EXISTS "base_content" text DEFAULT '' NOT NULL;
ALTER TABLE "note_content" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 0 NOT NULL;
