# Plan 001: Validate flashcard and misconception API payloads at runtime

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat b790030..HEAD -- apps/web/src/app/api/flashcards apps/web/src/app/api/misconceptions packages/database/src/flashcard-fsrs.ts apps/web/src/app/api/uploads/sessions/route.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, tests, tech-debt
- **Planned at**: commit `b790030`, 2026-06-11

## Why this matters

Several learning endpoints parse `request.json()` with TypeScript casts instead
of runtime schemas. TypeScript does not validate JSON at runtime, so invalid
values can reach database and scheduler code even though the route type says
they cannot. The most important case is flashcard review: a truthy but invalid
rating can reach FSRS scheduling as `ratingMap[input.rating]`, which is
`undefined` for unexpected strings.

This plan moves flashcard and misconception mutation routes onto explicit Zod
schemas and adds route tests for invalid payloads. The goal is not a broad
route rewrite; it is to close the unsafe learning API boundaries first.

## Current state

Relevant files:

- `apps/web/src/app/api/flashcards/review/route.ts` - review endpoint; imports learning automation and calls `reviewFlashcardForUser`.
- `packages/database/src/flashcard-fsrs.ts` - maps review ratings into `ts-fsrs`.
- `apps/web/src/app/api/flashcards/sets/route.ts` and dynamic flashcard routes - cast JSON bodies for set/card mutations.
- `apps/web/src/app/api/misconceptions/{resolve,improve,delete}/route.ts` - cast JSON bodies for misconception mutations.
- `apps/web/src/app/api/uploads/sessions/route.test.ts` - existing API route test style to copy.
- `apps/web/src/app/api/ai/retrieval/query/route.ts` and `apps/web/src/app/api/ai/ingestion/jobs/route.ts` - existing Zod route schema style to match.

Current flashcard review parsing:

```ts
// apps/web/src/app/api/flashcards/review/route.ts:14
const body = (await request.json().catch(() => ({}))) as {
  cardId?: string;
  rating?: "again" | "hard" | "good" | "easy";
  answerText?: string | null;
};

// apps/web/src/app/api/flashcards/review/route.ts:20
if (!(body.cardId && body.rating)) {
  return NextResponse.json(
    { error: "cardId and rating are required" },
    { status: 400 }
  );
}
```

Current scheduler mapping:

```ts
// packages/database/src/flashcard-fsrs.ts:46
const ratingMap: Record<FlashcardRating, Exclude<Rating, Rating.Manual>> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// packages/database/src/flashcard-fsrs.ts:137
const scheduled = scheduler.next(card, now, ratingMap[input.rating]);
```

Current cast-based patterns in neighboring routes:

```ts
// apps/web/src/app/api/flashcards/sets/[setId]/enrollment/route.ts:15
const body = (await request.json().catch(() => ({}))) as {
  newCardsPerDay?: number;
  status?: "active" | "paused";
};
```

```ts
// apps/web/src/app/api/misconceptions/improve/route.ts:19
const body = (await request.json().catch(() => ({}))) as {
  concept?: unknown;
  delta?: unknown;
  decay?: unknown;
  resolveThreshold?: unknown;
  subject?: unknown;
  topic?: unknown;
};
```

Existing route schema pattern:

```ts
// apps/web/src/app/api/ai/retrieval/query/route.ts:7
const querySchema = z.object({
  workspaceUuid: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional(),
  mode: z.enum(["auto", "fast", "full"]).optional(),
});
```

Existing API test style:

```ts
// apps/web/src/app/api/uploads/sessions/route.test.ts:110
it("rejects invalid payloads", async () => {
  getSessionUserMock.mockResolvedValue({ id: "user-1" });

  const response = await POST(
    new Request("http://localhost:3003/api/uploads/sessions", {
      method: "POST",
      body: JSON.stringify({
        workspaceUuid: "workspace-1",
      }),
    })
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Invalid payload",
  });
});
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Web typecheck | `pnpm --filter @avenire/web check-types` | exit 0, no errors |
| Focused route tests | `pnpm --filter @avenire/web exec vitest run 'src/app/api/flashcards/review/route.test.ts' 'src/app/api/flashcards/sets/route.test.ts' 'src/app/api/flashcards/sets/[setId]/route.test.ts' 'src/app/api/flashcards/sets/[setId]/cards/route.test.ts' 'src/app/api/flashcards/cards/[cardId]/route.test.ts' 'src/app/api/flashcards/sets/[setId]/enrollment/route.test.ts' 'src/app/api/misconceptions/resolve/route.test.ts' 'src/app/api/misconceptions/improve/route.test.ts' 'src/app/api/misconceptions/delete/route.test.ts'` | all selected tests pass |
| Existing learning tests | `pnpm --filter @avenire/web exec vitest run src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts src/lib/chat-tools/study-tool-helpers.test.ts` | all selected tests pass |

## Scope

**In scope**:

- `apps/web/src/app/api/flashcards/flashcard-route-model.ts` (create if useful)
- `apps/web/src/app/api/misconceptions/misconception-route-model.ts` (create if useful)
- `apps/web/src/app/api/flashcards/review/route.ts`
- `apps/web/src/app/api/flashcards/sets/route.ts`
- `apps/web/src/app/api/flashcards/sets/[setId]/route.ts`
- `apps/web/src/app/api/flashcards/sets/[setId]/cards/route.ts`
- `apps/web/src/app/api/flashcards/cards/[cardId]/route.ts`
- `apps/web/src/app/api/flashcards/sets/[setId]/enrollment/route.ts`
- `apps/web/src/app/api/misconceptions/resolve/route.ts`
- `apps/web/src/app/api/misconceptions/improve/route.ts`
- `apps/web/src/app/api/misconceptions/delete/route.ts`
- New tests beside the route files above.

**Out of scope**:

- `packages/database/src/flashcard-fsrs.ts` scheduler behavior. This plan blocks invalid input before it reaches the scheduler.
- UI form validation. Server validation is the source of truth.
- Broad migration of every API route in the app.
- Auth or workspace membership changes.

## Git workflow

- Branch: `advisor/001-validate-learning-api-payloads`
- Commit message style: use the repo's imperative style, for example `fix queued message uuid fallback`.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add shared schemas for learning route payloads

Create small model modules if they keep duplication down:

- `apps/web/src/app/api/flashcards/flashcard-route-model.ts`
- `apps/web/src/app/api/misconceptions/misconception-route-model.ts`

Use Zod, matching the existing API route style. Keep schemas narrow:

- review: `cardId` is a non-empty string, `rating` is `z.enum(["again", "hard", "good", "easy"])`, `answerText` is optional nullable string.
- set create/update: `title`, `description`, and `tags` should match what `createFlashcardSetForUser` and `updateFlashcardSetForUser` already accept. Do not add new business rules beyond basic shape validation and current trimming/sanitizing behavior.
- card create/update: keep `source` as a record because taxonomy validation already lives in `assertFlashcardTaxonomy`; validate `frontMarkdown`/`backMarkdown` are non-empty strings where required.
- enrollment: `status` is `z.enum(["active", "paused"]).optional()`, `newCardsPerDay` is an integer between 1 and 100. Use `z.coerce.number()` only if existing clients submit strings; otherwise prefer `z.number()`.
- misconception scope: `concept`, `subject`, and `topic` are trimmed non-empty strings.
- misconception improve: `delta`, `decay`, and `resolveThreshold` are optional finite numbers. Preserve existing clamping in database code; route validation should only reject non-numeric or non-finite inputs.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 2: Replace JSON casts in the route handlers

For every in-scope route, replace:

```ts
const body = (await request.json().catch(() => ({}))) as { ... };
```

with:

```ts
const parsed = schema.safeParse(await request.json().catch(() => ({})));
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
const body = parsed.data;
```

For routes that currently return a more specific message for missing fields,
keep the existing response text if a client is likely to depend on it. The most
important thing is that invalid enum and type values return `400` before calling
database or scheduler functions.

**Verify**: `pnpm --filter @avenire/web check-types` -> exit 0.

### Step 3: Add route tests for invalid payloads and happy-path forwarding

Add tests beside the route files. Follow the `vi.hoisted` and mocked module
style from `apps/web/src/app/api/uploads/sessions/route.test.ts`.

Minimum tests:

- `/api/flashcards/review`: invalid rating returns `400` and does not call `reviewFlashcardForUser`.
- `/api/flashcards/review`: valid rating calls `reviewFlashcardForUser` with the parsed rating.
- `/api/flashcards/sets/[setId]/enrollment`: invalid `status` returns `400` and does not call `upsertFlashcardSetEnrollmentForUser`.
- `/api/misconceptions/improve`: invalid numeric input, for example `"abc"` for `delta`, returns `400` and does not call `adjustMisconceptionConfidenceForConcept`.
- `/api/misconceptions/resolve` and `/delete`: blank concept/subject/topic returns `400`.
- A representative create/update flashcard route rejects missing taxonomy source and still returns the existing taxonomy error.

**Verify**:
`pnpm --filter @avenire/web exec vitest run 'src/app/api/flashcards/review/route.test.ts' 'src/app/api/flashcards/sets/route.test.ts' 'src/app/api/flashcards/sets/[setId]/route.test.ts' 'src/app/api/flashcards/sets/[setId]/cards/route.test.ts' 'src/app/api/flashcards/cards/[cardId]/route.test.ts' 'src/app/api/flashcards/sets/[setId]/enrollment/route.test.ts' 'src/app/api/misconceptions/resolve/route.test.ts' 'src/app/api/misconceptions/improve/route.test.ts' 'src/app/api/misconceptions/delete/route.test.ts'` -> all selected tests pass.

### Step 4: Run final focused and type verification

Run:

```bash
pnpm --filter @avenire/web check-types
pnpm --filter @avenire/web exec vitest run src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts src/lib/chat-tools/study-tool-helpers.test.ts
```

Expected: both commands exit 0. The focused learning tests should still pass.

## Test plan

- New route tests should cover invalid enum, invalid number, blank string, unauthorized user, and one happy-path call-through for the most important routes.
- Use `apps/web/src/app/api/uploads/sessions/route.test.ts` as the structural pattern.
- Do not mock Zod itself.

## Done criteria

- [ ] No in-scope flashcard or misconception mutation route casts `request.json()` directly to a payload interface.
- [ ] Invalid flashcard review ratings return `400` and do not reach `reviewFlashcardForUser`.
- [ ] Invalid misconception improve numeric values return `400`.
- [ ] `pnpm --filter @avenire/web check-types` exits 0.
- [ ] The focused route tests listed above pass.
- [ ] Existing focused learning tests still pass.
- [ ] `plans/README.md` status row for plan 001 is updated.

## STOP conditions

Stop and report back if:

- A route has an existing public contract that requires accepting string numbers for fields this plan would reject.
- Validation changes require database schema changes.
- `@avenire/web` route tests cannot import a dynamic route file even with quoted paths.
- The live code no longer matches the excerpts above.

## Maintenance notes

Reviewers should look for accidental behavior changes in sanitization. The
database layer already trims titles, descriptions, tags, and flashcard taxonomy;
this plan should validate shape at the boundary without duplicating every
sanitizer. Future learning routes should follow these model modules instead of
adding fresh `request.json() as ...` casts.
