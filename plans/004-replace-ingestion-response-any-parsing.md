# Plan 004: Replace ingestion response `any` parsing with typed guards

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat b790030..HEAD -- packages/ingestion/src/ingestion/embeddings.ts packages/ingestion/src/ingestion/provider-extractors.ts packages/ingestion/src/ingestion/ocr.ts packages/ingestion/src/retrieval/retrieve.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: type-safety, ingestion, tests
- **Planned at**: commit `b790030`, 2026-06-11

## Why this matters

The ingestion package has strict TypeScript enabled, but several provider
response paths bypass it with `any`. These are not harmless internal casts:
they parse external JSON from Cohere, Reddit, and Mistral batch OCR. Malformed
or shape-drifted provider responses can pass through as `number[][]`,
string-valued vectors, missing OCR body fields, or arbitrary nested Reddit
payloads.

This plan replaces the concrete `any` paths with typed guards and focused
tests. It does not ban every `unknown`: `unknown` is correct at JSON boundaries
when narrowed before use.

## Current state

Relevant files:

- `packages/ingestion/src/ingestion/embeddings.ts`
- `packages/ingestion/src/ingestion/provider-extractors.ts`
- `packages/ingestion/src/ingestion/ocr.ts`
- Existing test style: `packages/ingestion/src/retrieval/retrieve.test.ts`

Current embedding parser:

```ts
const extractEmbeddingsFromResponse = (json: any): number[][] => {
  if (Array.isArray(json?.embeddings)) {
    if (json.embeddings.length === 0) {
      return [];
    }

    if (Array.isArray(json.embeddings[0])) {
      return json.embeddings as number[][];
    }

    if (Array.isArray(json.embeddings[0]?.embedding)) {
      return json.embeddings.map((item: any) => item.embedding as number[]);
    }
  }

  if (Array.isArray(json?.embeddings?.float)) {
    return json.embeddings.float as number[][];
  }

  if (Array.isArray(json?.data)) {
    return [...json.data]
      .sort((a: any, b: any) => (a?.index ?? 0) - (b?.index ?? 0))
      .map((item: any) => item?.embedding ?? item?.embeddings?.float)
      .filter((value: unknown): value is number[] => Array.isArray(value));
  }

  return [];
};
```

Current embedding call site checks only count:

```ts
const batchEmbeddings = extractEmbeddingsFromResponse(json);

if (batchEmbeddings.length !== batch.length) {
  throw new Error(
    `Cohere embeddings length mismatch: expected ${batch.length}, received ${batchEmbeddings.length}.`
  );
}
```

Current Reddit parser:

```ts
const payload = (await response.json().catch(() => null)) as any;
const post = payload?.[0]?.data?.children?.[0]?.data;
```

Current OCR JSONL parser:

```ts
const parsed = JSON.parse(line) as Record<string, any>;
const customId =
  parsed.custom_id ??
  parsed.customId ??
  parsed.request?.custom_id ??
  parsed.request?.customId ??
  parsed.id;

const body =
  parsed.response?.body ?? parsed.body ?? parsed.output ?? parsed.result;
if (!(customId && body?.pages && Array.isArray(body.pages))) {
  continue;
}
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Ingestion typecheck | `pnpm --filter @avenire/ingestion check-types` | exit 0, no errors |
| Ingestion tests | `pnpm --filter @avenire/ingestion test` | all ingestion tests pass |
| Focused ingestion parser tests | `pnpm --filter @avenire/ingestion exec vitest run src/ingestion/embeddings.test.ts src/ingestion/ocr.test.ts src/ingestion/provider-extractors.test.ts` | selected tests pass, if all three files are added |

## Scope

**In scope**:

- `packages/ingestion/src/ingestion/embeddings.ts`
- Optional new `packages/ingestion/src/ingestion/embedding-response.ts`
- `packages/ingestion/src/ingestion/provider-extractors.ts`
- `packages/ingestion/src/ingestion/ocr.ts`
- Focused tests for the parser behavior above

**Out of scope**:

- Reranking or retrieval scoring behavior.
- Provider SDK replacement.
- Changing embedding model or dimensions.
- Blanket removal of every `unknown` in ingestion.

## Git workflow

- Branch: `advisor/004-ingestion-typed-provider-parsing`
- Commit message style: use the repo's imperative style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add reusable JSON guard helpers where needed

Use local helpers; avoid a broad utility module unless duplication becomes
real:

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> | null => {
  const nested = value[key];
  return isRecord(nested) ? nested : null;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
```

Keep helpers close to the parser that uses them unless two files need the same
logic.

**Verify**: `pnpm --filter @avenire/ingestion check-types` -> exit 0.

### Step 2: Replace embedding response `any` with a typed parser

Either keep `extractEmbeddingsFromResponse` in `embeddings.ts` and export a
small test-only surface, or move the parser into
`packages/ingestion/src/ingestion/embedding-response.ts` and import it from
`embeddings.ts`.

Requirements:

- Signature should accept `unknown`, not `any`.
- Preserve supported shapes:
  - `{ embeddings: number[][] }`
  - `{ embeddings: [{ embedding: number[] }] }`
  - `{ embeddings: { float: number[][] } }`
  - `{ data: [{ index, embedding }] }`
  - `{ data: [{ index, embeddings: { float: number[] } }] }`
- Sort `data` entries by numeric `index`, defaulting to original order only
  when index is missing or non-numeric.
- Validate every vector element is a finite number.
- Validate vector dimensions in `embedMultimodal` after parsing. Use
  `config.embeddingDimensions` as the expected dimension when it is positive.
- Throw a descriptive error when the provider response contains malformed
  vectors or wrong dimensions. Do not silently filter malformed vectors if that
  would make the response look like a length mismatch.

**Verify**: `pnpm --filter @avenire/ingestion check-types` -> exit 0.

### Step 3: Add embedding parser tests

Create `packages/ingestion/src/ingestion/embeddings.test.ts` or
`embedding-response.test.ts`.

Minimum tests:

- Parses Cohere `{ embeddings: { float: [...] } }`.
- Parses array-of-object embeddings.
- Parses OpenAI-style `data` out of order and returns vectors in index order.
- Rejects a vector containing a string, `NaN`, or `Infinity`.
- Rejects vectors with the wrong dimension when `embedMultimodal` checks the
  parsed result.

If testing through `embedMultimodal`, mock global `fetch` with a successful
response and restore it in `beforeEach`/`afterEach`.

**Verify**:
`pnpm --filter @avenire/ingestion exec vitest run src/ingestion/embeddings.test.ts` -> selected tests pass.

### Step 4: Replace Reddit parser `any`

In `provider-extractors.ts`, parse Reddit JSON as `unknown`. Use record and
array guards to reach:

`payload[0].data.children[0].data`

Only read string fields after type checks:

- `title`
- `selftext`
- `url`
- `url_overridden_by_dest`
- `secure_media.reddit_video.fallback_url`

If the response shape is missing, return the same provider shell with no title,
body, or media URLs rather than throwing.

**Verify**: `pnpm --filter @avenire/ingestion check-types` -> exit 0.

### Step 5: Replace OCR JSONL `any`

In `ocr.ts`, parse each JSONL line as `unknown`. Add a guard for `OcrResponse`:

- `model` is optional or a string if provider omits it in batch output.
- `pages` is an array.
- Each page has numeric `index` and string `markdown`.
- Optional `images` and `tables` arrays contain records with the string fields
  the renderer reads.

Keep the existing skip behavior for malformed lines, but do not cast
unvalidated `body` to `OcrResponse`.

**Verify**: `pnpm --filter @avenire/ingestion check-types` -> exit 0.

### Step 6: Add focused parser tests for Reddit and OCR

Add tests only if the functions can be reached without large exports. If the
parsers are private, prefer extracting tiny parser helpers over exporting full
provider functions.

Minimum tests:

- Reddit parser returns media URLs from `url`, `url_overridden_by_dest`, and
  video fallback when present.
- Reddit parser tolerates an unexpected payload shape.
- OCR JSONL parser accepts valid batch rows with `custom_id` or
  `request.custom_id`.
- OCR JSONL parser skips malformed JSON and rows without valid pages.

**Verify**:
`pnpm --filter @avenire/ingestion exec vitest run src/ingestion/ocr.test.ts src/ingestion/provider-extractors.test.ts` -> selected tests pass.

### Step 7: Run final package verification

Run:

```bash
pnpm --filter @avenire/ingestion check-types
pnpm --filter @avenire/ingestion test
```

Expected: both commands exit 0.

## Test plan

- Parser tests should include malformed external payloads, not only happy
  paths.
- Keep provider network calls mocked or isolated.
- Do not require real API keys.

## Done criteria

- [ ] `packages/ingestion/src/ingestion/embeddings.ts` has no `any` in response
  parsing.
- [ ] Malformed embedding vectors cannot pass as `number[][]`.
- [ ] Reddit payload parsing uses `unknown` plus guards.
- [ ] OCR JSONL parsing uses `unknown` plus guards.
- [ ] Focused parser tests cover malformed payloads.
- [ ] `pnpm --filter @avenire/ingestion check-types` exits 0.
- [ ] `pnpm --filter @avenire/ingestion test` exits 0.
- [ ] `plans/README.md` status row for plan 004 is updated.

## STOP conditions

Stop and report back if:

- Provider response fixtures prove a documented shape is being rejected.
- `config.embeddingDimensions` is not reliable in tests and cannot be safely
  overridden.
- Parser helper extraction would require changing public ingestion exports.
- The live parser code no longer matches the excerpts above.

## Maintenance notes

After this lands, `biome.json` can consider re-enabling
`suspicious.noExplicitAny` for `packages/ingestion/src` first, before trying to
apply it repo-wide.
