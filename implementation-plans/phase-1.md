# Phase 1: RAG Intelligence Layer

## Summary
- Upgrade retrieval quality without breaking existing callers.
- Add query expansion, hybrid lexical + vector retrieval, and richer context assembly.
- Keep the current `/api/ai/retrieval/query` request shape stable unless a caller explicitly needs debug metadata.

## Implementation Changes
- Query expansion
  - Add `expandQuery(query: string): Promise<string[]>` in `packages/ingestion/src/retrieval`.
  - Use a low-cost language model to generate 3-5 semantically close reformulations.
  - Deduplicate normalized expansions and always include the original query first.
  - Add structured logs for:
    - original query
    - generated expansions
    - per-query retrieval counts
    - final deduped chunk count
- Multi-query retrieval
  - Update retrieval internals so `retrieveRelevantChunks` can search multiple queries in parallel.
  - Preserve the public `retrieveWorkspaceChunks({ query })` entrypoint in `packages/ingestion/src/index.ts`.
  - Deduplicate by `chunkId` before reranking.
  - Keep existing modality-intent weighting unless it conflicts with merged ranking.
- Hybrid search
  - Extend ingestion chunk storage to support lexical search.
  - Add a `tsvector` column on `ingestion_chunk` and an index suitable for full-text search.
  - Populate lexical search data whenever chunks are inserted or refreshed in the ingestion pipeline.
  - Add a DB retrieval path in `packages/database/src/ingestion-data.ts` for BM25/full-text candidates.
  - Merge lexical and vector candidates with reciprocal rank fusion:
    - `rrf_score = sum(1 / (60 + rank))`
  - Feed the merged candidate set into the existing rerank stage.
- Context assembly
  - Ensure retrieved chunks expose metadata sufficient for user-facing citations:
    - `source document/title`
    - `page`
    - `timestamp`
    - note/file title or workspace path where available
  - Format each chunk with a metadata header before prompt assembly.
  - Add adjacent chunk expansion when a top result appears fragmentary.
  - Add token-budget trimming from the bottom of the ranked list.
- Observability
  - Add retrieval quality logs in:
    - `packages/ingestion/src/retrieval/retrieve.ts`
    - `apps/web/src/app/api/ai/retrieval/query/route.ts`
    - any chat tool path that consumes retrieval
  - Logs must be safe to sample in production and avoid persisting large raw chunk bodies unnecessarily.

## Public Interfaces / Types
- Keep current route contract:
  - `POST /api/ai/retrieval/query` still accepts a single `query`
- Add internal retrieval result metadata for debugging:
  - expanded queries used
  - retrieval strategy scores
  - whether adjacent chunks were included
- Add DB migration for lexical search support on `ingestion_chunk`.

## Test Plan
- Query expansion
  - Expanded queries always include the original query.
  - Duplicate expansions are removed.
- Hybrid retrieval
  - Vector-only relevant chunk and lexical-only relevant chunk can both surface in the merged candidate set.
  - RRF merge order is deterministic for identical inputs.
  - Existing vector retrieval still works when lexical index is empty.
- Context assembly
  - Returned chunks include metadata headers for PDF/video/markdown cases.
  - Adjacent chunks are added only from the same resource and in bounds.
  - Token budget trimming removes lowest-ranked entries first.
- API compatibility
  - `/api/ai/retrieval/query` response remains backward compatible for current consumers.

## Assumptions
- PostgreSQL is the long-term retrieval backend, so lexical search should live there beside pgvector.
- Existing reranking remains the final ordering step after candidate merge.
- Retrieval cache keys may need versioning so old vector-only results are not reused for hybrid retrieval.
