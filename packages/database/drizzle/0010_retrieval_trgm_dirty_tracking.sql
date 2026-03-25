CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "ingestion_chunk"
  ADD COLUMN IF NOT EXISTS "content_hash" text,
  ADD COLUMN IF NOT EXISTS "ingested_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS "ingestion_chunk_resource_hash_idx"
  ON "ingestion_chunk" ("resource_id", "content_hash");

CREATE INDEX IF NOT EXISTS "ingestion_chunk_content_trgm_idx"
  ON "ingestion_chunk" USING gin ("content" gin_trgm_ops);
