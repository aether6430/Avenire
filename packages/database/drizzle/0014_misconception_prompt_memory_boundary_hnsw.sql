ALTER TABLE "misconception"
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'candidate' NOT NULL,
  ADD COLUMN IF NOT EXISTS "evidence_class" text DEFAULT 'session' NOT NULL,
  ADD COLUMN IF NOT EXISTS "evidence_root_id" text,
  ADD COLUMN IF NOT EXISTS "evidence_span" jsonb,
  ADD COLUMN IF NOT EXISTS "source_session_id" text,
  ADD COLUMN IF NOT EXISTS "promoted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "decayed_at" timestamp with time zone;
--> statement-breakpoint

UPDATE "misconception"
SET
  "status" = CASE
    WHEN "active" THEN 'confirmed'
    WHEN "resolved_at" IS NOT NULL THEN 'resolved'
    ELSE 'candidate'
  END,
  "evidence_class" = CASE
    WHEN "source" IN ('manual', 'chat_tool') THEN 'manual'
    WHEN "source" IN ('review', 'fsrs_signal') THEN 'review'
    WHEN "source" = 'tool' THEN 'tool'
    ELSE 'session'
  END,
  "promoted_at" = CASE
    WHEN "active" THEN COALESCE("promoted_at", "first_seen_at")
    ELSE "promoted_at"
  END,
  "decayed_at" = CASE
    WHEN NOT "active" AND "resolved_at" IS NOT NULL THEN COALESCE("decayed_at", "resolved_at")
    ELSE "decayed_at"
  END;
--> statement-breakpoint

ALTER TABLE "misconception"
  ALTER COLUMN "active" SET DEFAULT false;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "misconception_user_status_idx"
  ON "misconception" USING btree ("user_id", "status", "last_seen_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "misconception_workspace_subject_topic_status_idx"
  ON "misconception" USING btree ("workspace_id", "subject", "topic", "status");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ingestion_embedding_embedding_hnsw_idx"
  ON "ingestion_embedding" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
