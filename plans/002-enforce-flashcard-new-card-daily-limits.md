# Plan 002: Enforce flashcard new-card daily limits across queue refreshes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat b790030..HEAD -- packages/database/src/flashcard-data.ts packages/database/src/schema.ts packages/database/src/flashcard-fsrs.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 001
- **Category**: bug, spaced-repetition, tests
- **Planned at**: commit `b790030`, 2026-06-11

## Why this matters

The due-card queue currently limits new cards only inside a single queue
response. After a user reviews a new card, that card gains review state and no
longer counts toward the in-memory `seenNewBySet` cap. A refresh can then show
another new card, and repeating that cycle can exceed `newCardsPerDay`.

That breaks the spaced-repetition contract: the daily new-card limit is meant
to control introduction pace across the day, not just the visible page size.

## Current state

Relevant files:

- `packages/database/src/flashcard-data.ts` - owns set hydration, queue
  construction, enrollment limits, and review logging.
- `packages/database/src/schema.ts` - `flashcardReviewLog` includes
  `previousState`, which is `null` for the first review of a new card.
- `packages/database/src/flashcard-fsrs.test.ts` - existing pure FSRS queue
  ordering tests.

Current queue cap:

```ts
// packages/database/src/flashcard-data.ts
const seenNewBySet = new Map<string, number>();
const filteredQueue = queue.filter((item) => {
  if (item.reviewState) {
    return true;
  }

  const enrollment = enrollmentBySetId.get(item.card.setId);
  const nextCount = (seenNewBySet.get(item.card.setId) ?? 0) + 1;
  if (nextCount > (enrollment?.newCardsPerDay ?? 20)) {
    return false;
  }

  seenNewBySet.set(item.card.setId, nextCount);
  return true;
});
```

Current review log evidence:

```ts
// packages/database/src/schema.ts
export const flashcardReviewLog = pgTable(
  "flashcard_review_log",
  {
    flashcardId: uuid("flashcard_id").notNull(),
    userId: text("user_id").notNull(),
    rating: text("rating").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    previousState: text("previous_state"),
    nextState: text("next_state").notNull(),
  }
);
```

Current review write:

```ts
// packages/database/src/flashcard-data.ts
await tx.insert(flashcardReviewLog).values({
  flashcardId: input.cardId,
  previousState: currentState?.state ?? null,
  rating: input.rating,
  reviewedAt,
  userId: input.userId,
});
```

Existing presentation counts:

```ts
// packages/database/src/flashcard-data.ts
const [cards, reviewTodayRows, review7dRows] = await Promise.all([
  listCardsForSetIds(setIds),
  listReviewLogSetIdsSince(userId, setIds, startOfDay(now)),
  listReviewLogSetIdsSince(userId, setIds, sevenDaysAgo(now)),
]);
```

Those counts include all reviews. They should not be reused directly for new
card gating because due review volume must not consume the new-card allowance.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Database typecheck | `pnpm --filter @avenire/database check-types` | exit 0, no errors |
| Database tests | `pnpm --filter @avenire/database test` | all database tests pass |
| Focused web learning tests | `pnpm --filter @avenire/web exec vitest run src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts src/lib/chat-tools/study-tool-helpers.test.ts` | selected tests pass |

## Scope

**In scope**:

- `packages/database/src/flashcard-data.ts`
- A focused database test, either in an existing test file or a new
  `packages/database/src/flashcard-queue.test.ts`
- A small pure helper module for queue quota math if it keeps testing simple

**Out of scope**:

- FSRS scheduling algorithm changes.
- Database schema migrations.
- UI copy or controls for `newCardsPerDay`.
- Time-zone preference work. Use the existing `startOfDay(now)` behavior for
  parity with current dashboard review counts.

## Git workflow

- Branch: `advisor/002-flashcard-new-card-daily-limit`
- Commit message style: use the repo's imperative style.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a first-review count query

In `packages/database/src/flashcard-data.ts`, add a helper next to
`listReviewLogSetIdsSince`:

- Input: `userId`, `setIds`, `since`.
- Join `flashcardReviewLog` to `flashcardCard`.
- Filter by `flashcardReviewLog.userId`, `flashcardCard.setId in setIds`,
  `flashcardReviewLog.reviewedAt >= since`, and
  `isNull(flashcardReviewLog.previousState)`.
- Return `{ setId, count }` rows grouped by `flashcardCard.setId`.

Use Drizzle `sql<number>` or a numeric conversion at the map boundary. Do not
count all reviews; only `previousState IS NULL` represents a new card being
introduced.

**Verify**: `pnpm --filter @avenire/database check-types` -> exit 0.

### Step 2: Thread today's introduced-new counts into queue construction

Either add the query to `hydrateSetSummaries()` or call it inside
`listDueFlashcardsForUser()` after accessible set IDs are known. Keep the data
shape explicit:

```ts
const newReviewsTodayBySet = new Map<string, number>();
```

When filtering new cards, subtract already introduced cards from the enrollment
limit:

```ts
const introducedToday = newReviewsTodayBySet.get(item.card.setId) ?? 0;
const available = Math.max(
  0,
  (enrollment?.newCardsPerDay ?? 20) - introducedToday
);
const nextCount = (seenNewBySet.get(item.card.setId) ?? 0) + 1;
if (nextCount > available) {
  return false;
}
```

Reviewed cards with due review state must still pass through even if
`introducedToday` is already at the daily cap.

**Verify**: `pnpm --filter @avenire/database check-types` -> exit 0.

### Step 3: Add focused tests for quota math

The current database package tests are mostly pure unit tests. Prefer a small
pure helper for queue filtering if that avoids standing up a database. The test
must cover:

- A set with `newCardsPerDay = 1` and `introducedToday = 1` returns zero new
  cards.
- Due reviewed cards are still returned when the new-card cap is exhausted.
- A set with `newCardsPerDay = 3`, `introducedToday = 1`, and three visible new
  candidates returns two new cards.
- Counts are per set, not global across all sets.

If you add a pure helper module, keep it narrowly named and feed it plain
objects so the test does not need Drizzle row types.

**Verify**: `pnpm --filter @avenire/database test` -> all database tests pass.

### Step 4: Run final focused verification

Run:

```bash
pnpm --filter @avenire/database check-types
pnpm --filter @avenire/database test
pnpm --filter @avenire/web exec vitest run src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts src/lib/chat-tools/study-tool-helpers.test.ts
```

Expected: all commands exit 0. The web learning runtime tests should still pass
because the public review queue shape is unchanged.

## Test plan

- Unit-test queue quota behavior with explicit inputs.
- Typecheck the database package to catch Drizzle aggregate typing issues.
- Run the existing web due-card tool tests to protect chat-tool behavior.

## Done criteria

- [ ] New-card quota subtracts first reviews already performed since
  `startOfDay(now)`.
- [ ] Due reviewed cards are not hidden by exhausted new-card quota.
- [ ] Quota behavior is tested per set.
- [ ] `pnpm --filter @avenire/database check-types` exits 0.
- [ ] `pnpm --filter @avenire/database test` exits 0.
- [ ] Focused web due-card tests still pass.
- [ ] `plans/README.md` status row for plan 002 is updated.

## STOP conditions

Stop and report back if:

- Existing production review logs cannot distinguish first reviews from later
  reviews.
- A DB-backed test harness already exists but requires unavailable environment
  variables.
- The fix would require a schema migration.
- The live queue code no longer matches the excerpts above.

## Maintenance notes

This plan intentionally preserves the existing local-day boundary. If Avenire
later adds user time zones, the new-card quota and dashboard review counts
should move together.
