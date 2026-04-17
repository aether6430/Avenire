# Phase 4 Audit

## `ingestion_embedding` index audit

The current vector storage path already exists, but it is not ANN-backed yet:

- `packages/database/src/schema.ts` defines `ingestion_embedding.embedding` as a `vector` column.
- `packages/database/src/ingestion-data.ts` validates embedding dimensionality before running the search query.
- The current migrations only create btree indexes on `ingestion_embedding.chunk_id` and `ingestion_embedding.model`.
- No HNSW or IVFFlat index exists in the schema or migration history.

## Vector query audit

The live vector query shape is already compatible with ANN indexing:

- `packages/database/src/ingestion-data.ts` uses `ORDER BY e.embedding <=> ${vectorLiteral}::vector`.
- The query uses the same vector operator family that HNSW would accelerate.
- There is no separate query rewrite needed to adopt ANN, only the index and tuning layer.

## ANN tuning audit

There is no explicit ANN tuning in the codebase yet:

- No code sets `ef_search`.
- No migration comments or runtime knobs describe HNSW rollout parameters.
- There is no benchmark harness in the repo that compares recall and latency before/after ANN adoption.

Downstream assumption:

- Phase 4 can be added without changing the retrieval SQL shape, but the rollout still needs recall checks on representative corpora so HNSW does not quietly degrade top-k quality.
