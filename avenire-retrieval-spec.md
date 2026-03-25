# Avenire Retrieval Infrastructure Spec
**Status:** Draft  
**Author:** Solo reference  
**Last updated:** 2026-03-23  
**Covers:** Three retrieval infrastructure improvements inspired by Cursor's indexing architecture

---

## Table of Contents

1. [Context & Motivation](#1-context--motivation)
2. [Feature A — pg_trgm Trigram Search](#2-feature-a--pg_trgm-trigram-search)
3. [Feature B — Content-Addressed Embedding Cache](#3-feature-b--content-addressed-embedding-cache)
4. [Feature C — Chunk-Level Dirty Tracking](#4-feature-c--chunk-level-dirty-tracking)
5. [Cross-Cutting Concerns](#5-cross-cutting-concerns)
6. [Rollout Plan](#6-rollout-plan)
7. [Open Questions](#7-open-questions)

---

## 1. Context & Motivation

Apollo, Avenire's AI tutor agent, retrieves context from a student's personal corpus — notes, OCR'd PDFs, transcribed lectures, PYQ sets — using a hybrid retrieval stack: Cohere v4 embeddings + BM25 + pgvector.

This stack has three meaningful gaps:

**Gap 1 — No pattern/formula search.** Semantic search and BM25 both fail on exact substring queries. When a student asks "show me everywhere I wrote `dv/dt`" or "find all questions with `sin²θ`", Apollo has no fast path. The only option is a full table scan, which doesn't scale past ~1,000 notes.

**Gap 2 — Redundant embedding work.** Many students share source material: the same HC Verma chapter, NCERT PDF, or DPP sheet. Every student who uploads the same document triggers a full Cohere embedding pass. At ~1,200 tokens per chunk, 200 chunks per textbook, and Cohere's per-token pricing, this accumulates fast and adds 10–30s of ingestion latency per shared document.

**Gap 3 — Wasteful re-embedding on note edits.** When a student edits a single sentence in a 2,000-word note, the current pipeline re-processes every chunk in the document. Most chunks are unchanged. This burns Cohere credits and adds latency to the save-to-searchable cycle.

These three features address each gap independently, with no hard dependencies between them. They can be implemented and shipped in any order.

---

## 2. Feature A — pg_trgm Trigram Search

### 2.1 Motivation

Trigram indexing (the basis of PostgreSQL's `pg_trgm` extension) splits text into every overlapping 3-character sequence and builds an inverted index over those sequences. This enables fast ILIKE / regex substring searches that would otherwise require a full sequential scan.

For Avenire's use case, this unlocks a new class of Apollo queries:
- Formula and notation search: `∂v/∂t`, `sin²θ`, `E = mc²`
- Identifier search: `MAX_MARKS`, `NCERT_EX_12.4`
- Verbatim phrase search: "first law of thermodynamics" (when semantic search returns too-broad results)
- Student self-search: "find every note where I mentioned Coulomb's law"

These are low-recall situations for BM25 (which tokenises on whitespace/punctuation and loses mathematical symbols) and low-precision for semantic search (which returns topically similar but not textually matching results).

### 2.2 How pg_trgm Works

`pg_trgm` ships with PostgreSQL. It computes all overlapping 3-character n-grams of a string and builds a GIN (Generalised Inverted Index) over them. At query time, it decomposes the search string into the same trigrams and performs posting-list intersection to find candidate rows, then confirms matches on the actual text.

False positives are possible (rows that contain all the trigrams but not the full string) — PostgreSQL handles this with a recheck pass. False negatives are not possible.

The key property: `ILIKE '%pattern%'` and `~` (regex) operators on a `gin_trgm_ops` column are index-accelerated. Without the index, these are O(n) full table scans. With it, they're typically O(log n) to O(k) where k is the number of matching rows.

### 2.3 Affected Tables

The primary target is the `chunks` table — whatever table stores the split, tokenised text units of a student's ingested documents and notes. Secondary target: the `notes` table itself for short-form notes that are not chunked.

**Current assumed schema (chunks table):**

```sql
chunks (
  id          uuid primary key,
  document_id uuid references documents(id),
  user_id     uuid references users(id),
  content     text not null,
  embedding   vector(1024),
  chunk_index integer,
  created_at  timestamptz,
  updated_at  timestamptz
)
```

### 2.4 Schema Changes

```sql
-- Enable the extension (run once, requires superuser or rds_superuser on RDS)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on chunk content
CREATE INDEX CONCURRENTLY idx_chunks_content_trgm
  ON chunks
  USING gin (content gin_trgm_ops);

-- If notes have a separate full-text field (non-chunked short notes)
CREATE INDEX CONCURRENTLY idx_notes_content_trgm
  ON notes
  USING gin (content gin_trgm_ops);
```

Use `CONCURRENTLY` in production — it builds without locking the table. Expect the build to take 1–5 minutes depending on table size; it's safe to run while the app is live.

**Drizzle migration equivalent:**

```typescript
// drizzle/migrations/0042_add_trgm_indexes.sql
// (Drizzle doesn't natively emit GIN indexes; use raw SQL migration)
export const up = sql`
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX CONCURRENTLY idx_chunks_content_trgm
    ON chunks USING gin (content gin_trgm_ops);
`;

export const down = sql`
  DROP INDEX IF EXISTS idx_chunks_content_trgm;
`;
```

### 2.5 Query Patterns

**Basic substring search (Apollo tool):**

```sql
SELECT
  c.id,
  c.content,
  c.document_id,
  c.chunk_index,
  similarity(c.content, $1) AS score
FROM chunks c
WHERE
  c.user_id = $2
  AND c.content ILIKE $3          -- $3 = '%pattern%'
ORDER BY score DESC
LIMIT 20;
```

**Regex search (for pattern queries like formulas):**

```sql
SELECT id, content, document_id
FROM chunks
WHERE user_id = $1
  AND content ~ $2               -- $2 = regex pattern e.g. 'sin.{0,3}θ'
LIMIT 20;
```

**Trigram similarity ranking (fuzzy match, not substring):**

```sql
SELECT id, content, similarity(content, $1) AS sim
FROM chunks
WHERE user_id = $2
  AND content % $1               -- % operator = similarity threshold (default 0.3)
ORDER BY sim DESC
LIMIT 10;
```

Set threshold with: `SET pg_trgm.similarity_threshold = 0.25;` (lower = more results, more permissive).

### 2.6 Apollo Tool Integration

Add a new tool to Apollo's tool registry alongside the existing `semantic_search` and `bm25_search` tools:

```typescript
// tools/trigram_search.ts
export const trigramSearchTool = {
  name: 'trigram_search',
  description: `Search the student's notes and documents for an exact substring, 
    formula, notation, or regex pattern. Use this when the query contains mathematical 
    notation, code identifiers, verbatim phrases, or any case where exact character 
    match matters more than semantic meaning.`,
  inputSchema: z.object({
    pattern: z.string().describe(
      'The substring or regex pattern to search for. Wrap in % for ILIKE or use regex syntax.'
    ),
    mode: z.enum(['substring', 'regex', 'fuzzy']).default('substring'),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async ({ pattern, mode, limit }, { userId }) => {
    return db.trigramSearch({ pattern, mode, limit, userId });
  },
};
```

**Routing heuristic for Apollo's retrieval planner:**

Apollo should route to `trigram_search` when the query contains:
- Mathematical symbols: `∂`, `∑`, `∫`, `θ`, `²`, `√`, etc.
- Quoted phrases: `"first law of thermodynamics"`
- Code-like identifiers: `CAPS_WITH_UNDERSCORES`, camelCase tokens
- Explicit user intent: "find exactly", "search for the phrase", "where did I write"

This routing logic lives in the retrieval planner prompt, not in code. Example addition to Apollo's system prompt:

```
When the student's query contains mathematical notation, quoted phrases, or asks to 
"find" or "search for" specific text, call trigram_search rather than semantic_search. 
Use semantic_search for conceptual questions and understanding queries.
```

### 2.7 Edge Cases

**Unicode and mathematical symbols.** `pg_trgm` operates on Unicode code points, so `∂v/∂t` will index correctly. No special handling needed. However, OCR'd PDFs may have inconsistent encoding for math symbols — a student's notes might have `∂` (U+2202) while a PDF has the ASCII approximation `d`. Document this limitation: trigram search works best on notes the student typed themselves.

**Very short patterns.** Trigrams require at least 3 characters. Patterns like `v₀` (2 characters) will fall back to a sequential scan. Add a guard:

```typescript
if (pattern.replace(/[^a-zA-Z0-9\u0080-\uFFFF]/g, '').length < 3) {
  // Fall back to BM25 or return a helpful message
}
```

**Regex safety.** Untrusted regex patterns from students could cause catastrophic backtracking. Wrap regex execution in a statement timeout:

```sql
SET statement_timeout = '2s';
SELECT ... WHERE content ~ $1;
```

And validate patterns on the server before executing:

```typescript
function isSafeRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    // Add: check for known catastrophic patterns (e.g. (a+)+ )
    return true;
  } catch {
    return false;
  }
}
```

**Index size.** A GIN trigram index on a text column is typically 2–3x the size of the column data. For 1M chunks averaging 500 characters each, expect ~500MB of index. Budget for this in your RDS storage tier.

### 2.8 Performance Expectations

On a GIN-indexed column, `ILIKE '%pattern%'` queries over 1M rows typically return in 10–50ms depending on selectivity. Without the index the same query takes 2–10s. The index is most effective for patterns 4+ characters long; very common short patterns (e.g., `the`) will still be slow due to large posting lists.

---

## 3. Feature B — Content-Addressed Embedding Cache

### 3.1 Motivation

Cohere's `embed-multilingual-v3` model is stateless and deterministic: the same input text always produces the same embedding vector. This means embeddings are a pure function of content. There is no reason to compute them more than once per unique chunk of text.

In practice, many students share source material: HC Verma chapters, NCERT textbooks, previous year papers (PYQs), and standard DPP sheets are uploaded repeatedly. Each upload currently triggers a full ingestion pipeline run — chunking, OCR if needed, and Cohere embedding for every chunk. For a 400-page textbook chunked into ~300 chunks at 512 tokens each, this means 300 Cohere API calls per student per shared book.

A content-addressed cache short-circuits this: hash the chunk text, look it up in a shared cache table, and if the embedding already exists, copy it directly. No Cohere call needed.

### 3.2 Architecture

The cache is a single PostgreSQL table keyed by the SHA-256 hash of the normalised chunk text. It is shared across all users (the embedding is not user-specific — it is purely a function of the text).

```
Ingestion pipeline (BullMQ job)
  │
  ├─ 1. Chunk document into text segments
  │
  ├─ 2. For each chunk:
  │     a. Normalise text (trim whitespace, normalise unicode)
  │     b. Compute SHA-256 hash
  │     c. CHECK cache table for hash
  │          HIT  → copy embedding directly into chunks table → done
  │          MISS → call Cohere API → insert into cache → insert into chunks table
  │
  └─ 3. Update document ingestion status
```

### 3.3 Schema Changes

**New table: `embedding_cache`**

```sql
CREATE TABLE embedding_cache (
  content_hash   char(64) PRIMARY KEY,   -- SHA-256 hex digest
  embedding      vector(1024) NOT NULL,
  model          text NOT NULL DEFAULT 'embed-multilingual-v3',
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_used_at   timestamptz NOT NULL DEFAULT now(),
  use_count      integer NOT NULL DEFAULT 1
);

-- Index for cache eviction queries (by last used, for LRU cleanup)
CREATE INDEX idx_embedding_cache_last_used ON embedding_cache (last_used_at);
```

**Modified `chunks` table:**

```sql
ALTER TABLE chunks ADD COLUMN content_hash char(64);
ALTER TABLE chunks ADD COLUMN embedding_source text 
  CHECK (embedding_source IN ('computed', 'cached'));
```

**Drizzle schema additions:**

```typescript
// schema/embedding_cache.ts
export const embeddingCache = pgTable('embedding_cache', {
  contentHash: char('content_hash', { length: 64 }).primaryKey(),
  embedding: vector('embedding', { dimensions: 1024 }).notNull(),
  model: text('model').notNull().default('embed-multilingual-v3'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  useCount: integer('use_count').notNull().default(1),
});

// schema/chunks.ts (additions)
contentHash: char('content_hash', { length: 64 }),
embeddingSource: text('embedding_source')  // 'computed' | 'cached'
```

### 3.4 Implementation

**Text normalisation (must be identical at write and read time):**

```typescript
function normaliseChunkText(raw: string): string {
  return raw
    .trim()
    .replace(/\r\n/g, '\n')          // normalise line endings
    .replace(/\u00A0/g, ' ')         // non-breaking space → regular space
    .normalize('NFC');               // Unicode canonical form
}

function hashChunkText(normalised: string): string {
  return createHash('sha256').update(normalised, 'utf8').digest('hex');
}
```

**Cache lookup and population (within BullMQ ingestion worker):**

```typescript
async function getOrComputeEmbedding(
  chunkText: string,
  db: Database,
  cohere: CohereClient
): Promise<{ embedding: number[]; source: 'computed' | 'cached' }> {
  const normalised = normaliseChunkText(chunkText);
  const hash = hashChunkText(normalised);

  // 1. Try cache
  const cached = await db
    .select({ embedding: embeddingCache.embedding })
    .from(embeddingCache)
    .where(eq(embeddingCache.contentHash, hash))
    .limit(1);

  if (cached.length > 0) {
    // Update LRU metadata — fire and forget, non-blocking
    db.update(embeddingCache)
      .set({ lastUsedAt: new Date(), useCount: sql`use_count + 1` })
      .where(eq(embeddingCache.contentHash, hash))
      .execute()
      .catch(console.error);

    return { embedding: cached[0].embedding, source: 'cached' };
  }

  // 2. Compute via Cohere
  const response = await cohere.embed({
    texts: [normalised],
    model: 'embed-multilingual-v3',
    inputType: 'search_document',
  });
  const embedding = response.embeddings[0];

  // 3. Populate cache — upsert handles race condition from concurrent workers
  await db
    .insert(embeddingCache)
    .values({ contentHash: hash, embedding, model: 'embed-multilingual-v3' })
    .onConflictDoUpdate({
      target: embeddingCache.contentHash,
      set: { lastUsedAt: new Date(), useCount: sql`use_count + 1` },
    });

  return { embedding, source: 'computed' };
}
```

**Batch optimisation.** Cohere's embed API accepts up to 96 texts per request. Check the cache for all chunks in a batch first, then make a single Cohere call for all misses:

```typescript
async function batchGetOrComputeEmbeddings(
  chunks: { id: string; text: string }[],
  db: Database,
  cohere: CohereClient
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();
  const hashes = chunks.map(c => ({
    ...c,
    normalised: normaliseChunkText(c.text),
    hash: hashChunkText(normaliseChunkText(c.text)),
  }));

  // Batch cache lookup
  const allHashes = hashes.map(h => h.hash);
  const cachedRows = await db
    .select()
    .from(embeddingCache)
    .where(inArray(embeddingCache.contentHash, allHashes));

  const cacheMap = new Map(cachedRows.map(r => [r.contentHash, r.embedding]));
  const misses = hashes.filter(h => !cacheMap.has(h.hash));

  // Record cache hits
  for (const h of hashes) {
    if (cacheMap.has(h.hash)) {
      results.set(h.id, cacheMap.get(h.hash)!);
    }
  }

  if (misses.length === 0) return results;

  // Single Cohere call for all misses
  const response = await cohere.embed({
    texts: misses.map(m => m.normalised),
    model: 'embed-multilingual-v3',
    inputType: 'search_document',
  });

  // Populate cache and results
  const insertValues = misses.map((m, i) => ({
    contentHash: m.hash,
    embedding: response.embeddings[i],
    model: 'embed-multilingual-v3',
  }));

  await db
    .insert(embeddingCache)
    .values(insertValues)
    .onConflictDoUpdate({
      target: embeddingCache.contentHash,
      set: { lastUsedAt: new Date(), useCount: sql`use_count + 1` },
    });

  for (let i = 0; i < misses.length; i++) {
    results.set(misses[i].id, response.embeddings[i]);
  }

  return results;
}
```

### 3.5 Cache Eviction

The cache is shared and append-only by default. For early scale (< 10k students, < 5M cached chunks) you can skip eviction entirely — storage cost is ~4KB per cached chunk (1024 floats × 4 bytes), so 5M entries ≈ 20GB. Plan a simple LRU eviction cron job for when you approach that threshold:

```typescript
// cron/evict_embedding_cache.ts — run nightly
async function evictOldCacheEntries(db: Database) {
  const KEEP_DAYS = 90;
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400 * 1000);

  await db
    .delete(embeddingCache)
    .where(
      and(
        lt(embeddingCache.lastUsedAt, cutoff),
        lt(embeddingCache.useCount, 3)   // only evict rarely-used entries
      )
    );
}
```

### 3.6 Edge Cases

**Model version change.** If you upgrade from `embed-multilingual-v3` to a new model, old cached embeddings are incompatible. The `model` column handles this — always filter by `model = current_model` when querying the cache. On a model upgrade, run a one-time cleanup:

```sql
DELETE FROM embedding_cache WHERE model != 'embed-multilingual-v4';
```

Or run a background re-embedding job, using `content_hash` + the cache table itself as input (no need to re-fetch the original documents).

**Race conditions.** Two ingestion workers may simultaneously miss the cache for the same hash and both call Cohere. This is fine — the `onConflictDoUpdate` upsert ensures only one row survives, and the duplicate Cohere call is wasted but harmless. This race can only happen once per unique chunk on first ingestion.

**Sensitive content.** The cache is shared across users. The `embedding_cache` table must contain no `user_id` or `document_id` — only `content_hash` and the embedding vector. Confirm this via audit query before shipping:

```sql
-- Should return no rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'embedding_cache'
  AND column_name IN ('user_id', 'document_id', 'note_id');
```

**Chunking consistency.** The cache is only effective if the same source text produces the same chunks across ingestion runs. If you change your chunking strategy (chunk size, overlap, boundary rules), old cache entries will miss for re-chunked text. Version your chunking strategy and include the version in the cache key:

```typescript
const CHUNK_STRATEGY_VERSION = 'v2';
const hash = hashChunkText(`${CHUNK_STRATEGY_VERSION}:${normalised}`);
```

### 3.7 Expected Impact

For a shared textbook (300 chunks, ~500 tokens each):
- Without cache: 300 Cohere embed calls, ~15–30s ingestion time, ~$0.015 per student
- With cache (warm): 0 Cohere calls, ~200ms ingestion time (just DB reads + inserts), $0.00

At 100 students sharing 5 textbooks: saves ~150,000 Cohere calls. Modest in absolute dollar terms now; compounds significantly at scale.

---

## 4. Feature C — Chunk-Level Dirty Tracking

### 4.1 Motivation

When a student edits a note in the Tiptap editor and saves, the ingestion pipeline currently re-processes the entire document: re-chunks, re-hashes, re-embeds every chunk. For a 2,000-word note with 8 chunks, editing a single sentence triggers 8 Cohere embed calls when only 1 chunk actually changed.

Chunk-level dirty tracking solves this by maintaining a stable hash per chunk and only re-embedding chunks whose content has changed since the last ingestion. Combined with Feature B (the embedding cache), this means even re-embeddings are often free — if a student edits a sentence back to its original text, the cache will hit.

### 4.2 Architecture

The core idea: each chunk has a `content_hash` computed at ingestion time. On re-ingestion, compute hashes for the new chunks and diff them against stored hashes. Emit only the changed chunks for re-embedding.

```
Note save event
  │
  ├─ 1. Extract plain text from Tiptap JSON doc
  ├─ 2. Chunk into segments (same deterministic strategy as original ingestion)
  ├─ 3. For each chunk: compute content_hash
  ├─ 4. Load existing chunk hashes from DB for this document
  ├─ 5. Diff:
  │     - New hash not in DB            → INSERT new chunk, embed it
  │     - Hash in DB, content same      → no-op (skip)
  │     - Hash in DB, position changed  → UPDATE chunk_index only (no re-embed)
  │     - Old hash no longer present    → DELETE chunk
  │
  └─ 6. Re-embed only dirty chunks (via Feature B cache → Cohere fallback)
```

This is a simplified Merkle-style approach at the chunk level. A full parent-level tree (document → section → chunk) would add complexity for little gain at Avenire's current content hierarchy.

### 4.3 Schema Changes

The `chunks` table needs `content_hash` from Feature B. Additional fields:

```sql
ALTER TABLE chunks
  ADD COLUMN content_hash  char(64),        -- SHA-256 of normalised chunk text
  ADD COLUMN chunk_index   integer,         -- position in document (0-based)
  ADD COLUMN ingested_at   timestamptz DEFAULT now();

-- Unique constraint: one chunk per position per document
CREATE UNIQUE INDEX idx_chunks_doc_position
  ON chunks (document_id, chunk_index);

-- Fast lookup of all hashes for a document (used in diff step)
CREATE INDEX idx_chunks_document_hash
  ON chunks (document_id, content_hash);
```

**Drizzle additions:**

```typescript
// schema/chunks.ts
contentHash: char('content_hash', { length: 64 }),
chunkIndex: integer('chunk_index').notNull(),
ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
```

### 4.4 Chunking Strategy Contract

For dirty tracking to work correctly, the chunking strategy must be deterministic and stable. Given the same input text, it must always produce the same chunks at the same positions. Pin the chunker config explicitly:

```typescript
// lib/chunker.ts
const CHUNK_SIZE = 512;       // tokens
const CHUNK_OVERLAP = 64;     // tokens
const CHUNK_STRATEGY = 'v1';  // bump this if chunking logic changes

export function chunkDocument(text: string): Array<{
  text: string;
  index: number;
  hash: string;
}> {
  const segments = splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
  return segments.map((segment, index) => ({
    text: segment,
    index,
    hash: hashChunkText(`${CHUNK_STRATEGY}:${normaliseChunkText(segment)}`),
  }));
}
```

### 4.5 Diff Algorithm

```typescript
type StoredChunk = {
  id: string;
  chunkIndex: number;
  contentHash: string;
};

type NewChunk = {
  text: string;
  index: number;
  hash: string;
};

type DiffResult = {
  toInsert: NewChunk[];
  toUpdate: Array<{ id: string; newIndex: number }>;   // position change only
  toDelete: string[];                                   // chunk IDs to remove
  unchanged: Array<{ id: string; chunk: NewChunk }>;
};

function diffChunks(stored: StoredChunk[], incoming: NewChunk[]): DiffResult {
  const storedByHash = new Map(stored.map(c => [c.contentHash, c]));
  const incomingByHash = new Map(incoming.map(c => [c.hash, c]));

  const toInsert: NewChunk[] = [];
  const toUpdate: Array<{ id: string; newIndex: number }> = [];
  const toDelete: string[] = [];
  const unchanged: Array<{ id: string; chunk: NewChunk }> = [];

  for (const chunk of incoming) {
    const existing = storedByHash.get(chunk.hash);
    if (!existing) {
      toInsert.push(chunk);
    } else if (existing.chunkIndex !== chunk.index) {
      toUpdate.push({ id: existing.id, newIndex: chunk.index });
      unchanged.push({ id: existing.id, chunk });
    } else {
      unchanged.push({ id: existing.id, chunk });
    }
  }

  for (const storedChunk of stored) {
    if (!incomingByHash.has(storedChunk.contentHash)) {
      toDelete.push(storedChunk.id);
    }
  }

  return { toInsert, toUpdate, toDelete, unchanged };
}
```

### 4.6 Re-ingestion Handler

```typescript
// workers/note_reingestion.ts

async function reingestNote(
  noteId: string,
  userId: string,
  tipTapDoc: TipTapJSON,
  db: Database,
  cohere: CohereClient
) {
  // 1. Extract plain text from Tiptap JSON
  const plainText = extractPlainText(tipTapDoc);

  // 2. Chunk
  const incomingChunks = chunkDocument(plainText);

  // 3. Load existing chunks
  const storedChunks = await db
    .select({
      id: chunks.id,
      chunkIndex: chunks.chunkIndex,
      contentHash: chunks.contentHash,
    })
    .from(chunks)
    .where(eq(chunks.documentId, noteId));

  // 4. Diff
  const diff = diffChunks(storedChunks, incomingChunks);

  // 5. Apply diff in a transaction
  await db.transaction(async (tx) => {
    // Delete removed chunks
    if (diff.toDelete.length > 0) {
      await tx.delete(chunks).where(inArray(chunks.id, diff.toDelete));
    }

    // Update position-only changes
    for (const { id, newIndex } of diff.toUpdate) {
      await tx.update(chunks)
        .set({ chunkIndex: newIndex })
        .where(eq(chunks.id, id));
    }

    // Insert new chunks (with embeddings)
    if (diff.toInsert.length > 0) {
      const embeddings = await batchGetOrComputeEmbeddings(
        diff.toInsert.map(c => ({ id: c.hash, text: c.text })),
        tx,
        cohere
      );

      const newRows = diff.toInsert.map(c => ({
        id: crypto.randomUUID(),
        documentId: noteId,
        userId,
        content: c.text,
        contentHash: c.hash,
        chunkIndex: c.index,
        embedding: embeddings.get(c.hash)!,
        embeddingSource: 'computed' as const,
        ingestedAt: new Date(),
      }));

      await tx.insert(chunks).values(newRows);
    }
  });

  return {
    inserted: diff.toInsert.length,
    updated: diff.toUpdate.length,
    deleted: diff.toDelete.length,
    unchanged: diff.unchanged.length,
  };
}
```

### 4.7 Integration with the Tiptap Save Pipeline

The re-ingestion job should be triggered on note save with a debounce to avoid redundant runs on rapid saves.

```typescript
// In your note save API route (e.g. app/api/notes/[id]/route.ts)

const NOTE_REINGEST_DEBOUNCE_MS = 3000;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { content } = await req.json(); // Tiptap JSON doc
  const userId = await getAuthUserId(req);

  // Save the raw doc immediately (user expects instant save)
  await db.update(notes)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(notes.id, params.id), eq(notes.userId, userId)));

  // Enqueue re-ingestion job with BullMQ deduplication
  await reingestQueue.add(
    `reingest:${params.id}`,
    { noteId: params.id, userId, content },
    {
      jobId: `reingest:${params.id}`,  // same jobId = BullMQ deduplicates
      delay: NOTE_REINGEST_DEBOUNCE_MS,
      removeOnComplete: true,
    }
  );

  return Response.json({ ok: true });
}
```

BullMQ's `jobId` deduplication means that if the student saves 5 times in 3 seconds, only one re-ingestion job runs — for the latest content.

### 4.8 Edge Cases

**Chunk boundary shift.** If a student inserts a paragraph near the top of a long note, every subsequent chunk shifts down by some number of tokens. The hash diff will see most chunks as "new" (content genuinely changed) or "position changed" (boundary fell in the same place). This is correct behaviour. The embedding cache (Feature B) will typically hit for content-unchanged chunks even when the diff treats them as new inserts, so Cohere cost stays low.

**Chunking strategy version change.** If `CHUNK_STRATEGY` is bumped (e.g., chunk size changes from 512 to 768), the hashes of all existing chunks are invalid for comparison. On upgrade: trigger a full re-ingestion for all documents via a background BullMQ job sweep. Flag affected documents with a `needs_reingest` boolean column.

**Very large notes.** Notes over ~50,000 words will produce hundreds of chunks. The diff and transaction are both O(n). Add a guard:

```typescript
if (incomingChunks.length > 500) {
  logger.warn(`Note ${noteId} has ${incomingChunks.length} chunks — falling back to full reingest`);
  return fullReingestDocument(noteId, userId, tipTapDoc, db, cohere);
}
```

**Concurrent saves.** If two saves race (e.g., multi-device), the unique index on `(document_id, chunk_index)` prevents duplicate chunk positions. Last writer wins on the note content; the re-ingestion job runs for whichever save was most recent.

---

## 5. Cross-Cutting Concerns

### 5.1 Observability

Instrument each feature with structured logs. Emit these events from your ingestion worker:

```typescript
// Feature B metrics
logger.info('embedding_cache_result', {
  documentId,
  totalChunks: chunks.length,
  cacheHits: result.hits,
  cacheMisses: result.misses,
  hitRate: result.hits / chunks.length,
});

// Feature C metrics
logger.info('chunk_diff_result', {
  noteId,
  inserted: diff.toInsert.length,
  updated: diff.toUpdate.length,
  deleted: diff.toDelete.length,
  unchanged: diff.unchanged.length,
  cohere_calls_saved: diff.unchanged.length,
});
```

Aggregate these in Axiom (or whatever logging platform you're using) to track cache hit rate over time and validate that both features are actually saving work.

### 5.2 Feature Interactions

Features B and C compose cleanly:
- Feature C identifies which chunks need new embeddings (dirty chunks only)
- Feature B checks the cache before calling Cohere for each dirty chunk
- The cache hit rate for dirty chunks is often high (e.g., a student re-typing a sentence they deleted — same text → cache hit, zero Cohere calls)

Feature A is fully independent of B and C. It uses a separate code path (SQL search vs. vector search) and a separate index. No interactions.

### 5.3 Rollback Plan

Each feature is independently deployable and reversible:

**Feature A:** Drop the GIN index (`DROP INDEX idx_chunks_content_trgm`) and remove the `trigram_search` tool from Apollo's registry. No data loss.

**Feature B:** Add `EMBEDDING_CACHE_ENABLED=false` env var and a feature flag check in `getOrComputeEmbedding`. The pipeline falls back to always calling Cohere. The `embedding_cache` table can be left in place or dropped independently of the chunks table.

**Feature C:** Add `DIRTY_TRACKING_ENABLED=false` to trigger full re-ingestion on every save. The `content_hash` and `chunk_index` columns are additive and don't break existing queries if the feature is disabled.

---

## 6. Rollout Plan

### Phase 1 — Feature A: pg_trgm (Week 1)

Low risk, no data migration, immediate user-facing value.

1. Enable `pg_trgm` extension on dev → staging → production
2. Run `CREATE INDEX CONCURRENTLY` in production (off-hours, non-blocking)
3. Implement `trigram_search` tool + add routing hint to Apollo's system prompt
4. Ship behind a feature flag for internal testing
5. Validate query latency in production with `EXPLAIN ANALYZE`
6. Enable for all users

**Acceptance criteria:**
- `ILIKE '%sin²θ%'` over 100k chunks returns in < 100ms
- Apollo correctly routes formula queries to `trigram_search` in > 80% of manual test cases
- No regression in existing semantic/BM25 search latency

### Phase 2 — Feature B: Embedding Cache (Weeks 2–3)

1. Write and run migration: `embedding_cache` table + `content_hash` column on `chunks`
2. Implement `batchGetOrComputeEmbeddings` in ingestion worker
3. Test with a single shared document — upload HC Verma Ch 1 from two test accounts, confirm second ingestion produces 0 Cohere calls and completes in < 500ms
4. Ship to production; monitor cache hit rate via logs
5. Set up nightly eviction cron once cache grows > 1M entries

**Acceptance criteria:**
- Cache hit rate > 70% for shared documents within 2 weeks of rollout
- Ingestion time for a previously-cached 300-chunk document < 1s
- No cross-user data leakage (confirm `embedding_cache` has no `user_id` column)

### Phase 3 — Feature C: Dirty Tracking (Weeks 3–4)

Build on Feature B being stable in production first.

1. Add `chunk_index` and `ingested_at` to chunks table migration
2. Confirm `content_hash` is being populated (from Phase 2)
3. Implement `diffChunks` function with unit tests covering insert/update/delete/unchanged cases
4. Implement `reingestNote` handler, wire into BullMQ with debounced trigger
5. Test with a large note (> 10 chunks): edit one sentence, confirm via logs that only 1 chunk re-embeds
6. Ship behind feature flag; monitor `chunk_diff_result` logs
7. Enable for all users

**Acceptance criteria:**
- Single-sentence edit on a 10-chunk note triggers exactly 1 Cohere embed call (or 0 if cache hits)
- Unchanged chunks account for > 85% of total chunks on typical saves
- No stale embeddings: semantic search results reflect note edits within 5s of save

---

## 7. Open Questions

| # | Question | Notes |
|---|----------|-------|
| 1 | Should `embedding_cache` be scoped per-organisation eventually, or remain global? | Global is simpler and maximises hit rate. Revisit if B2B orgs are added and want data isolation. |
| 2 | What's the right debounce for note re-ingestion? | 3s is a starting guess. Too short = redundant jobs; too long = stale search during rapid editing. Tune based on observed save frequency. |
| 3 | Should trigram search respect document-level access control beyond `user_id`? | Fine for now. Revisit if group/shared notes are added — will need a join to a permissions table. |
| 4 | Should cache hit rate be exposed in an Avenire admin dashboard? | Low-effort add-on. Useful for debugging ingestion issues and validating cost-saving claims over time. |
| 5 | Should chunking strategy version be stored per-document or globally? | Per-document allows graceful migration (old docs on v1, new docs on v2 coexist). Worth it if chunking changes are anticipated. |
