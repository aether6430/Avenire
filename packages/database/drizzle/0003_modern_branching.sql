ALTER TABLE "chat_thread" ADD COLUMN IF NOT EXISTS "branching" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_thread_branching_chat_thread_id_fk'
  ) THEN
    ALTER TABLE "chat_thread"
      ADD CONSTRAINT "chat_thread_branching_chat_thread_id_fk"
      FOREIGN KEY ("branching")
      REFERENCES "public"."chat_thread"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "chat_thread_branching_idx"
  ON "chat_thread" USING btree ("branching");
