# Retrieval and Learning-Memory Hardening Spec

## Status

Draft

## Purpose

This spec defines the implementation plan to:

- make retrieval feel instant for chat and API-driven search,
- improve retrieval accuracy and citation quality,
- raise persisted misconception classification precision into the `80-90%` range,
- reduce prompt-memory contamination from weak or stale learner state,
- add the runtime observability needed to tune the system safely in production.

This plan is based on the current architecture in:

- [packages/ingestion/src/retrieval/retrieve.ts](/home/apollo/Code/avenire/packages/ingestion/src/retrieval/retrieve.ts:630)
- [apps/web/src/app/api/ai/retrieval/query/route.ts](/home/apollo/Code/avenire/apps/web/src/app/api/ai/retrieval/query/route.ts:55)
- [apps/web/src/lib/retrieval-cache.ts](/home/apollo/Code/avenire/apps/web/src/lib/retrieval-cache.ts:48)
- [apps/web/src/app/api/chat/route.ts](/home/apollo/Code/avenire/apps/web/src/app/api/chat/route.ts:701)
- [apps/web/src/lib/session-summaries.ts](/home/apollo/Code/avenire/apps/web/src/lib/session-summaries.ts:207)
- [apps/web/src/lib/chat-tools/index.ts](/home/apollo/Code/avenire/apps/web/src/lib/chat-tools/index.ts:182)
- [apps/backend/src/ingestion-worker.ts](/home/apollo/Code/avenire/apps/backend/src/ingestion-worker.ts:186)

## Goals

- Warm retrieval target: `p95 < 300 ms` for common chat queries.
- Cold retrieval target: degrade gracefully, but avoid unnecessary model work on the critical path.
- Persisted automatic misconception precision target: `0.80-0.90` on held-out labeled data.
- Prevent low-confidence misconception signals from entering hidden prompt memory.
- Ensure ingestion updates invalidate stale retrieval results immediately and proactively warm the hottest cache entries.

## Non-Goals

- Replacing PostgreSQL full-text search with an external search engine.
- Rebuilding the flashcard scheduling model from scratch.
- Removing all heuristic ranking logic in one pass.
- Perfect misconception recall. Precision of persisted learner memory is the priority.

## Current Problems

### Retrieval

- Retrieval always performs query expansion, embeddings, candidate fusion, reranking, adjacent-chunk expansion, and `corpusStats()` on the request path.
- Query cache exists, but only the standalone retrieval API uses it.
- Cache invalidation is TTL/version based, not corpus-version aware.
- Ingestion completion does not warm the retrieval cache.
- Ranking mixes semantic, lexical, trigram, modality, and learner-signal heuristics without calibrated score normalization.
- Context assembly is fixed-budget and can clip derivations or caveats.

### Misconceptions and Learning Memory

- Automatic misconception persistence is too permissive.
- Signals from different pipelines can represent the same underlying evidence and be double-counted.
- Active misconception context is injected too broadly.
- Prompt memory accepts raw `body.context` alongside server-generated memory.
- Confirmed misconception expiry is underspecified and not tied to learning state.

### Operational Gaps

- No fast-path calibration loop exists.
- No runtime visibility into fast/slow path routing, confidence gating, or misconception promotion decisions.
- Shared service boundaries are not explicit, so retrieval hardening and misconception hardening would compete for the same layer.

## Design Principles

1. Keep the hot path small.
2. Calibrate before gating.
3. Treat prompt memory as a trust boundary.
4. Persist only learner state with defensible evidence.
5. Prefer precision over recall for hidden tutoring context.
6. Make ingestion-driven invalidation and warming explicit.

## Rollout Sequence

### Phase 0: Instrumentation and Audit

Ship observability and dependency audit work before changing behavior.

Deliverables:

- Add retrieval decision logging for:
  - query shape,
  - confidence score,
  - ambiguity flags,
  - cache hit/miss,
  - expansion used,
  - rerank used,
  - latency,
  - top result source-type mix,
  - context truncation.
- Add misconception lifecycle logging for:
  - candidate created,
  - candidate rejected,
  - candidate promoted,
  - candidate decayed,
  - confirmed misconception injected,
  - confirmed misconception resolved.
- Audit all `body.context` callers and downstream assumptions before changing the contract.

Acceptance:

- We can answer, from logs alone, which retrieval path a query took and why.
- We can answer, from logs alone, why a misconception was promoted or rejected.
- We have a grep-backed dependency list for `body.context`.

### Phase 1: Shared Retrieval Service

Create a shared server-side retrieval service used by both chat and API callers.

Responsibilities:

- query normalization,
- cache lookup,
- corpus fingerprint lookup,
- confidence computation,
- path selection,
- retrieval execution,
- result metadata and logging.

Required changes:

- Move route-local cache usage behind a shared service interface.
- Update chat tools to use the same service instead of calling retrieval directly.
- Extend cache keys to include a workspace corpus fingerprint.

Suggested interface:

```ts
type RetrievalMode = "auto" | "fast" | "full";

interface RetrievalRequest {
  workspaceId: string;
  userId?: string;
  query: string;
  limit?: number;
  sourceType?: string;
  provider?: string;
  mode?: RetrievalMode;
}

interface RetrievalResponse {
  results: RetrievedChunk[];
  context: string;
  latencyMs: number;
  cache: "hit" | "miss";
  path: "fast" | "slow";
  confidence: number;
  ambiguityReasons: string[];
  corpusFingerprint: string;
}
```

Acceptance:

- API retrieval and chat retrieval produce the same metadata shape.
- Query caching applies to both chat and API callers.
- A corpus update invalidates stale cached results immediately.

### Phase 2: Retrieval Calibration Before Gating

Do not enable fast/slow branching immediately. First, run the full path while computing the fast-path score and decision shadow-side.

Calibration outputs:

- fraction of queries that would have taken the fast path at multiple thresholds,
- top-k overlap between fast candidate set and full candidate set,
- citation agreement between fast and full responses,
- latency savings by threshold,
- failure clusters by query type.

Confidence inputs should include:

- semantic score margin between top candidates,
- lexical agreement with semantic top hits,
- query ambiguity indicators,
- source-type consensus,
- whether the expanded query materially changes the candidate set,
- evidence density after context assembly.

Acceptance:

- We select an initial threshold from observed data.
- We know the expected fast-path hit rate and error tradeoff before rollout.

### Phase 3: Fast/Slow Retrieval Paths

Enable a production fast path only after calibration.

#### Fast Path

Use when confidence is high and ambiguity is low.

Behavior:

- original query only,
- single embedding pass,
- semantic + lexical + trigram retrieval,
- no query expansion,
- no reranking,
- no `corpusStats()` on the request path,
- minimal context assembly.

#### Slow Path

Use when confidence is low, ambiguity is high, or the user explicitly requests deep search.

Behavior:

- query expansion enabled,
- multimodal and modality-aware candidate retrieval,
- reranking enabled,
- adaptive context assembly,
- optional learner-signal boost pass after core ranking stabilizes.

Acceptance:

- Warm-path `p95 < 300 ms` on representative traffic.
- Slow-path accuracy beats or matches current behavior on evaluation sets.
- Fast-path regressions are caught by calibration dashboards and evals.

### Phase 4: ANN Indexing

Add ANN indexing to `pgvector` and make the index choice explicit.

Decision:

- Use HNSW.
- Initial index parameters:
  - `m = 16`
  - `ef_construction = 64`
- Tune `ef_search` under real traffic after rollout.

Why HNSW:

- better fit for thousands to low millions of vectors,
- no coarse partition tuning requirement,
- avoids IVFFlat cluster-quality sensitivity and reindexing burden at current scale.

Migration scope:

- add the HNSW index on `ingestion_embedding.embedding`,
- confirm dimension/operator compatibility with current vector queries,
- benchmark recall and latency before making it default in production.

Acceptance:

- Vector retrieval latency drops materially versus sequential or non-ANN access.
- Recall at top-k remains acceptable on evaluation queries.

### Phase 5: Cache Invalidation and Warming

Corpus-fingerprint invalidation is necessary but insufficient. Add proactive warming after ingestion success.

Trigger:

- successful ingestion completion for a workspace.

Warmup candidates:

- recent successful chat retrieval queries for that workspace,
- recent concept and misconception topics,
- recent file titles and aliases,
- recent search queries from the retrieval API,
- unresolved learner questions from session summaries.

Implementation notes:

- warm asynchronously after `job.succeeded`,
- rate-limit warmups per workspace,
- skip warming if the corpus delta is too small,
- log warm coverage and post-ingest cold-miss rate.

Acceptance:

- After a large ingest, warm-query latency stays within target for common queries.
- Cold-miss spikes after ingest become visible and bounded.

### Phase 6: Misconception Model Hardening

Split misconception state into `candidate` and `confirmed`.

#### Candidate

- created from automatic signals,
- not injected into hidden prompt memory,
- not allowed to materially penalize mastery,
- decays automatically if not reinforced.

#### Confirmed

- can influence prompt memory,
- can affect mastery and flashcard generation,
- requires strong evidence or manual confirmation.

Promotion rules:

- one explicit manual or tool confirmation, or
- two independent evidence classes within a recency window.

Independence definition:

- signals are independent only if they come from different evidence roots.
- two pipelines operating on the same review streak or the same session summary are not independent.
- example of valid independence:
  - chat transcript shows a wrong model of a concept,
  - later spaced-repetition failures occur on cards grounded in the same concept.
- example of invalid independence:
  - session summary inference and FSRS inference both derived from the same failed review burst.

Expiry rules:

- candidate misconceptions expire on a short inactivity window.
- confirmed misconceptions decay according to learning state, not a fixed TTL.
- use concept stability / next-due horizon as the primary decay input.
- allow explicit resolution when the learner demonstrates corrected understanding.

Acceptance:

- Automatic misconception persistence reaches `0.80-0.90` precision on held-out data.
- Candidate misconceptions never enter hidden prompt memory.
- Double-counted evidence paths are blocked by provenance checks.

### Phase 7: Two-Stage Misconception Classification

Replace the current heuristic pipeline with two explicit stages.

#### Stage 1: Confusion Detection

Detect whether the learner is likely confused or uncertain.

Inputs:

- transcript turns,
- repair patterns,
- contradiction markers,
- repeated requests for explanation,
- review failures.

#### Stage 2: Misconception Verification

Verify that there is a concrete wrong model, not just uncertainty.

Requirements:

- identifiable incorrect belief or procedure,
- concept/topic grounding,
- evidence span or review provenance,
- confidence score,
- source evidence class.

Acceptance:

- Misconception verification precision is high enough for candidate storage.
- Persisted confirmed misconceptions meet the production precision target.

### Phase 8: Prompt Memory Boundary Hardening

Treat all learner memory fed into the system prompt as trusted-server state only.

Changes:

- audit and remove raw `body.context` from the prompt contract,
- replace it with typed, server-generated memory blocks,
- gate historical memory by freshness, confidence, and topic match,
- scope misconceptions by `subject + topic`, not subject only,
- separate current-session continuity from historical learner profile.

Acceptance:

- Untrusted request payloads cannot silently join hidden prompt memory.
- Historical misconceptions do not bleed into unrelated topics.

## Data Model Changes

### Retrieval

- add `workspace_corpus_fingerprint` derivation or equivalent version source,
- optionally add a small retrieval query-log table if existing observability is insufficient,
- add cache metadata fields if responses need to expose path and confidence.

### Misconceptions

Add or extend fields for:

- `status`: `candidate | confirmed | resolved | decayed`,
- `confidence`,
- `subject`,
- `topic`,
- `concept_id` if available,
- `evidence_class`,
- `evidence_root_id`,
- `evidence_span`,
- `promoted_at`,
- `decayed_at`,
- `resolved_at`,
- `source_session_id`,
- `source_review_event_ids`.

### Session Summaries

- store structured misconception references rather than flattening them into free-form summary text,
- preserve provenance needed to detect correlated evidence.

## Ranking and Context Assembly Changes

- Normalize semantic, lexical, trigram, rerank, modality, and learner-signal contributions onto a comparable scale.
- Soften hard modality penalties for ambiguous queries.
- Reduce learner-signal weight on the first-pass ranking.
- Replace fixed one-chunk adjacency expansion with boundary-aware assembly.
- Preserve proof steps, caveats, definitions, and local context when assembling long answers.

## Observability

### Retrieval Metrics

- request count,
- fast-path rate,
- slow-path rate,
- cache hit rate,
- warm-cache hit rate after ingest,
- confidence distribution,
- ambiguity reason distribution,
- p50/p95/p99 latency by path,
- top-k agreement between fast and full shadow runs,
- citation coverage and citation mismatch rate.

### Misconception Metrics

- candidate creation rate,
- candidate rejection rate,
- promotion rate,
- false-promotion rate from labeled review,
- decay rate,
- resolution rate,
- prompt-injected misconception count,
- by-source precision and recall.

### Ingestion Metrics

- corpus fingerprint updates,
- invalidation events,
- warmup jobs launched,
- warmup success rate,
- post-ingest cold misses,
- ingest-to-searchable latency.

## Test Plan

### Retrieval Performance

- benchmark warm and cold paths separately,
- benchmark chat and API retrieval through the shared service,
- compare pre/post ANN latency.

### Retrieval Quality

- recall@k,
- MRR,
- citation correctness,
- long-answer context preservation,
- ambiguous-modality queries,
- expansion-drift regressions.

### Misconception Quality

- held-out labeled dataset for transcript-derived signals,
- held-out labeled dataset for review-derived signals,
- precision/recall by evidence class,
- promotion/decay correctness.

### Boundary and Reliability

- regression tests proving candidate misconceptions never enter hidden prompt memory,
- regression tests proving `body.context` removal does not break intended flows,
- ingestion recovery tests,
- cache invalidation and warmup tests.

## Risks

- An aggressive fast-path rollout can trade latency for subtle relevance regressions.
- HNSW tuning can reduce recall if `ef_search` is pushed too low.
- Cache warming can create burst load if not rate-limited.
- Over-tight misconception confirmation can improve precision while suppressing useful learner adaptation.
- `body.context` removal may break latent product behaviors if the audit is incomplete.

## Open Questions

- What is the right corpus fingerprint source of truth: ingestion job watermark, content hash aggregate, or resource version table?
- Should fast-path shadow evaluation stay permanently enabled for a sample of traffic?
- Where should misconception evidence lineage live if multiple tables need to reference the same evidence root?
- Should learner-signal boosts be fully disabled on the fast path or merely capped?

## Recommended First Milestone

Ship Phases 0 and 1 together:

- shared retrieval service,
- unified cache interface,
- corpus-fingerprint-aware cache keys,
- production logging for retrieval decisions,
- misconception lifecycle logging,
- `body.context` dependency audit.

That milestone removes the main architecture bottleneck: multiple correctness-sensitive systems currently depend on different retrieval and memory paths, which makes both performance tuning and safety tuning harder than they need to be.
