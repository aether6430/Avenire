# Avenire — Implementation Plan
*RAG Intelligence Layer · Misconception Engine · Closed Learning Loop*

---

## Phase 0 — Prep

Before touching any of the three systems, make sure the foundation is solid.

**Flashcard tagging** — every card created (via chat tool call or manually) needs `subject`, `topic`, and `concept` tags at creation time. If cards are being created without these, fix that first. Everything downstream depends on it.

**FSRS review event hooks** — make sure there's a hook or event you can subscribe to whenever a card is rated. You'll need this for both the misconception signal and the mastery score update. If it's a direct DB write today with no event emitted, wrap it.

**Subject/topic detection** — the misconception injection and mastery score are scoped by subject. You need a lightweight way to detect which subject a query or session belongs to. A simple classifier prompt or keyword map is fine to start.

---

## Phase 1 — RAG Intelligence Layer (P0)

These are additive changes to the existing retrieval pipeline. Nothing breaks if you add them incrementally.

### 1.1 Query Expansion

**Add** a `expandQuery(query: string): Promise<string[]>` utility that calls the LLM and returns 3–5 alternative phrasings.

**Update** the retrieval function to accept an array of queries, run searches in parallel, and deduplicate results by chunk ID before passing to the reranker.

**Add** logging around expansion quality — what was the raw query, what expansions were generated, what chunks were retrieved. You'll want this for tuning later.

### 1.2 Hybrid Search

**Create** a `tsvector` column on your chunks table (or enable `pg_search` if your setup supports it).

**Update** the ingestion pipeline to populate the BM25 index alongside the vector embedding on every chunk insert.

**Update** the retrieval function to run BM25 and pgvector queries in parallel, then merge using RRF (`score = Σ 1 / (60 + rank)`).

**Update** the reranking step to receive the merged candidate list — it should already work, just needs the broader input.

### 1.3 Context Assembly

**Update** the chunk retrieval to return metadata alongside content: `source_document`, `page_number` (PDF), `timestamp_seconds` (video), `note_title` (notes).

**Update** context assembly to format each chunk with its metadata header before concatenation, e.g. `[Atkins Physical Chemistry, p.142]`.

**Add** surrounding-chunk expansion: when a retrieved chunk's content looks like a fragment (e.g. starts mid-sentence, or is a theorem without proof), pull the adjacent chunks from the same document.

**Add** a token budget guard — trim from the bottom of the ranked list if total context exceeds your limit.

---

## Phase 2 — Misconception Engine (P0 → P1)

### 2.1 Database

**Create** the `misconceptions` table: `id`, `user_id`, `concept`, `subject`, `topic`, `source`, `confidence`, `resolved_at`, `created_at`.

**Create** the `concept_mastery` table: `user_id`, `concept`, `subject`, `mastery_score`, `misconception_count`, `last_reviewed_at`.

### 2.2 Capture — Path A (tutor tool call)

**Add** `log_misconception` as a tool in the Deep Tutor tool call registry. Schema: `{ concept, reason, subject, topic, confidence }`.

**Add** the tool handler: upsert logic — if an unresolved misconception with the same `user_id + concept` exists, increment confidence. Otherwise insert.

**Update** the Deep Tutor system prompt to instruct the model it has this tool and when to use it (detecting confused concepts, wrong formula application, flawed reasoning).

### 2.3 Capture — Path B (FSRS signal)

**Update** the FSRS review event hook (from Phase 0) to check the rating. On "Again" × 2 consecutive for the same card, call the misconception upsert with `source: fsrs_signal`, starting confidence 0.6.

**Add** a helper that maps a card's tags to `concept + subject + topic` for the misconception record.

### 2.4 Injection into RAG

**Add** a `getActiveMisconceptions(userId, subject)` query — returns unresolved misconceptions for a given user and subject, capped at 5.

**Update** the chat/retrieval handler to call this before building the system prompt, and inject the result as a system-level note with the instruction: *address these if they surface naturally; do not announce them unprompted.*

### 2.5 Resolution

**Update** the FSRS review hook to also check for resolution: 3 consecutive "Good" or "Easy" on cards tagged to a concept → set `resolved_at = now()` on the matching misconception.

**Add** a `updateMasteryScore(userId, concept)` call that fires on every resolution and on every FSRS review.

---

## Phase 3 — Concept Mastery Score (P1)

**Add** `updateMasteryScore(userId, concept)` — queries all FSRS cards tagged to that concept for the user, averages their stability values, normalizes to 0–1, upserts into `concept_mastery`.

**Wire** this to fire on: every FSRS review event, every misconception resolution.

**Add** `getMasteryBySubject(userId, subject)` — returns all concepts for a subject with their scores. This is what the dashboard will consume.

---

## Phase 4 — Session Summaries (P1)

**Create** a `session_summaries` table: `id`, `user_id`, `started_at`, `ended_at`, `concepts_covered`, `misconceptions_detected`, `flashcards_created`, `summary_text`.

**Add** session lifecycle tracking in the chat handler — on session start, create a record; on session end, trigger summary generation.

**Add** a summary generation step: pass the session's tool call log and message history to the LLM, ask it to produce a structured summary. Persist to `session_summaries`.

**Update** the Deep Tutor context builder to optionally include the most recent relevant session summary ("Last time you covered Gibbs free energy and struggled with sign conventions").

---

## Phase 5 — Concept Map Dashboard (P2)

**Add** a dashboard section that calls `getMasteryBySubject` and renders concepts as a grid or map, colored by mastery score.

**Add** a "Drill my weakest concepts" button — queries the bottom N mastery scores for the user, kicks off a targeted flashcard session.

This is a frontend-only feature once the data layer from Phases 2–3 is in place.

---

## What to Skip (For Now)

- User manual misconception capture (Path C) — build Paths A and B first, validate signal quality
- Predicted exam score — intentionally excluded
- Manim, Excalidraw — deferred

---

## Order of Attack

```
Phase 0 — tagging + hooks + subject detection
  ↓
Phase 1 — query expansion → hybrid search → context assembly  (can parallelize)
  ↓
Phase 2.1 + 2.2 — schema + tool call  (do together)
  ↓
Phase 2.3 — FSRS signal
  ↓
Phase 2.4 + 2.5 — injection + resolution  (do together)
  ↓
Phase 3 — mastery score
  ↓
Phase 4 — session summaries
  ↓
Phase 5 — dashboard
```

Phases 1 and 2.1–2.2 can be worked on in parallel if bandwidth allows. Everything else is sequential.
