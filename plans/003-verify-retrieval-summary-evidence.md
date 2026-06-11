# Plan 003: Verify retrieval-summary evidence before prompting the model

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat b790030..HEAD -- apps/web/src/app/api/ai/retrieval/summary/route.ts apps/web/src/app/api/files/route.test.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, retrieval, security, tests
- **Planned at**: commit `b790030`, 2026-06-11

## Why this matters

`/api/ai/retrieval/summary` accepts client-provided `matches`, including
snippets and titles, and uses them as evidence in the LLM prompt before proving
that each matched file is accessible in the workspace. A client can submit a
valid UUID and fabricated snippets; if no attachment record is fetched, the
route can still call `generateText` because `textualEvidence.length > 0`.

The route should never let unverified client text become source-of-truth
evidence. The minimum fix is to verify file access for every file ID that
contributes text or citation allowance, then filter evidence and citations down
to accessible files only.

## Current state

Relevant files:

- `apps/web/src/app/api/ai/retrieval/summary/route.ts` - route under review.
- `apps/web/src/app/api/files/route.test.ts` - API route test style with
  hoisted mocks and file-route source checks.
- `apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts` - examples of
  mocking `@avenire/ai` and `getFileAssetById`.

Current schema accepts client snippets:

```ts
const summarySchema = z.object({
  matches: z
    .array(
      z.object({
        fileId: z.uuid({ version: "v4" }),
        sourceType: z
          .enum(["pdf", "image", "video", "audio", "markdown", "link"])
          .optional(),
        snippet: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      })
    )
    .max(24)
    .optional(),
  fileIds: z.array(z.uuid({ version: "v4" })).max(10).optional(),
  workspaceUuid: z.uuid({ version: "v4" }),
  query: z.string().min(1),
  stream: z.boolean().optional(),
});
```

Current route derives trusted IDs from the request:

```ts
const matches = parsed.data.matches ?? [];
const matchedFileIds = matches.map((match) => match.fileId);
const fallbackFileIds = parsed.data.fileIds ?? [];
const fileIds = Array.from(
  new Set([...matchedFileIds, ...fallbackFileIds])
).slice(0, 12);
```

Current route builds textual evidence before access filtering:

```ts
const textualEvidence = Array.from(groupedMatches.entries())
  .filter(([, group]) => {
    const sourceType = group.sourceType ?? "";
    return (
      DOCUMENT_SOURCE_TYPES.has(sourceType) || group.snippets.length > 0
    );
  })
  .slice(0, 8)
  .map(([fileId, group]) => {
    const title = group.title ?? fileId;
    const topSnippets = group.snippets.slice(0, 3);
    return [
      `Document file: ${title} (${fileId})`,
      ...topSnippets.map(
        (snippet, index) => `Chunk ${index + 1}: ${snippet}`
      ),
    ].join("\n");
  });
```

Current file access happens later and only for attachment candidates:

```ts
const fileRecords = (
  await Promise.all(
    attachmentCandidateIds
      .slice(0, attachmentLimit * 2)
      .map(async (fileId) =>
        getFileAssetById(parsed.data.workspaceUuid, fileId)
      )
  )
).filter((record): record is NonNullable<typeof record> => Boolean(record));

if (fileRecords.length === 0 && textualEvidence.length === 0) {
  return summaryResponse(FALLBACK_SUMMARY, parsed.data.stream);
}
```

Current citation validation also uses request-derived IDs:

```ts
flagInvalidCitations({
  allowedFileIds: fileIds,
  text: summary,
});
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Web typecheck | `pnpm --filter @avenire/web check-types` | exit 0, no errors |
| Focused retrieval summary test | `pnpm --filter @avenire/web exec vitest run 'src/app/api/ai/retrieval/summary/route.test.ts'` | all selected tests pass |
| Existing retrieval query test if present | `pnpm --filter @avenire/web exec vitest run 'src/app/api/ai/retrieval/summary/route.test.ts' src/lib/chat-tools/workspace-file-helpers.test.ts` | selected tests pass |

## Scope

**In scope**:

- `apps/web/src/app/api/ai/retrieval/summary/route.ts`
- New `apps/web/src/app/api/ai/retrieval/summary/route.test.ts`

**Out of scope**:

- Rewriting the retrieval pipeline.
- Adding a server-side re-query to `@avenire/ingestion`.
- Changing the public request schema, unless the tests prove a narrower schema
  is required.
- Stream transport redesign.

## Git workflow

- Branch: `advisor/003-retrieval-summary-evidence-access`
- Commit message style: use the repo's imperative style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Resolve accessible file records before building evidence

After `fileIds` is computed, fetch accessible records for all candidate file
IDs, not just non-document attachment candidates:

```ts
const accessibleFileRecords = (
  await Promise.all(
    fileIds.map((fileId) => getFileAssetById(parsed.data.workspaceUuid, fileId))
  )
).filter((record): record is NonNullable<typeof record> => Boolean(record));
```

Build:

- `accessibleFileIds = new Set(accessibleFileRecords.map((file) => file.id))`
- `accessibleFileRecordsById = new Map(...)`
- `allowedFileIds = Array.from(accessibleFileIds)`

If `allowedFileIds.length === 0`, return `FALLBACK_SUMMARY` and do not call
`generateText` or `streamText`.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 2: Filter textual evidence to accessible files only

When building `textualEvidence`, filter `groupedMatches` by
`accessibleFileIds.has(fileId)`. Prefer the accessible file record name over
the client-provided title when available. Keep snippets only after the access
check.

The prompt can still use client-provided retrieval snippets for documents, but
only for files the authenticated user can access in the requested workspace.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 3: Filter attachment candidates to accessible records

Use `accessibleFileRecords` as the source for attachment loading. Do not call
`getFileAssetById` a second time for IDs already fetched. Preserve existing
attachment limits, byte limits, media-type normalization, markdown note lookup,
and fetch timeout behavior.

If `attachedFiles.length === 0 && textualEvidence.length === 0`, return
`FALLBACK_SUMMARY`.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 4: Validate citations against accessible IDs only

Replace every citation validation call that passes `fileIds` with
`allowedFileIds`.

This matters even if the model ignores fabricated snippets: an inaccessible ID
must not be accepted as a valid workspace citation.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 5: Add route tests

Create `apps/web/src/app/api/ai/retrieval/summary/route.test.ts`. Use hoisted
mocks for:

- `getSessionUser`
- `ensureWorkspaceAccessForUser`
- `getFileAssetById`
- `getNoteContent`
- `isMarkdownFileRecord`
- `generateText`
- `streamText`
- `validateWorkspaceFileCitations`
- `createApiLogger`

Minimum tests:

- Unauthorized request returns `401` and does not fetch files or call the model.
- Forbidden workspace returns `403` and does not fetch files or call the model.
- A request with only client snippets for an inaccessible file returns the
  fallback summary and does not call `generateText`.
- A mixed request filters inaccessible snippets and calls `generateText` with
  only accessible evidence in the prompt.
- Citation validation receives only accessible file IDs.
- Invalid payload returns `400`.

For the stream path, either add one small test that `streamText` receives the
filtered prompt, or explicitly leave it untested if the non-stream branch uses
the same filtered inputs.

**Verify**:
`pnpm --filter @avenire/web exec vitest run 'src/app/api/ai/retrieval/summary/route.test.ts'` -> all selected tests pass.

### Step 6: Run final focused verification

Run:

```bash
pnpm --filter @avenire/web check-types
pnpm --filter @avenire/web exec vitest run 'src/app/api/ai/retrieval/summary/route.test.ts' src/lib/chat-tools/workspace-file-helpers.test.ts
```

Expected: both commands exit 0.

## Test plan

- Route-level tests should mock workspace access and file access separately.
- Assertions should inspect the generated prompt enough to prove inaccessible
  snippets are absent and accessible snippets remain.
- Assertions should confirm the model is not called when all evidence is
  inaccessible.

## Done criteria

- [ ] Client-provided snippets are used only after `getFileAssetById` confirms
  workspace access for that file.
- [ ] Attachment loading uses already verified file records.
- [ ] Fallback summary returns without model calls when no accessible evidence
  remains.
- [ ] Citation validation allows only accessible file IDs.
- [ ] Focused route tests cover inaccessible fabricated snippets.
- [ ] `pnpm --filter @avenire/web check-types` exits 0.
- [ ] `plans/README.md` status row for plan 003 is updated.

## STOP conditions

Stop and report back if:

- `getFileAssetById` does not reliably enforce workspace access.
- Frontend callers depend on summaries for files that are not in the workspace.
- Filtering accessible IDs requires a new database query that is unavailable in
  the web app layer.
- The live route no longer matches the excerpts above.

## Maintenance notes

This plan does not make retrieval snippets cryptographically trusted; it makes
them access-checked. A stronger future design would have the summary endpoint
receive retrieval IDs or rerun retrieval server-side, but this plan closes the
current regression with a small blast radius.
