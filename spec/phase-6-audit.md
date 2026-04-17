# Phase 6 Audit

## Misconception state audit

The misconception model is still a single active-row lifecycle:

- `packages/database/src/schema.ts` stores `misconception` rows with `active`, `confidence`, `evidenceCount`, `firstSeenAt`, `lastSeenAt`, and `resolvedAt`.
- There is no `candidate` or `confirmed` status field.
- `packages/database/src/learning-data.ts` upserts directly into the same table for every signal source.
- The current logging distinguishes `candidate.promoted` and `confirmed.reinforced`, but that distinction is derived only from `evidenceCount`.

## Promotion and decay audit

The current lifecycle is permissive and confidence-driven:

- `upsertMisconception()` immediately marks every new row active.
- `improveMisconceptionsForConcept()` reduces `confidence` and clears `active` only after a threshold is crossed.
- `resolveMisconceptionsForConcept()` and `resolveMisconceptionById()` both collapse the state directly to inactive/resolved.
- There is no explicit candidate decay window separate from confirmed misconception decay.

## Evidence provenance audit

Different writers feed the same misconception table, but provenance is still shallow:

- `apps/web/src/lib/session-summaries.ts` can generate automatic candidates from a single LLM summarization pass.
- `packages/database/src/flashcard-learning-automation.ts` emits `fsrs_signal` misconceptions from repeated review failures.
- `apps/web/src/lib/chat-tools/index.ts` exposes manual/chat-tool logging for the same table.
- The stored record does not track evidence class, evidence root, or evidence span, so independence checks are not enforceable at write time.

## Mastery coupling audit

Learner mastery is already coupled to misconception state:

- `concept_mastery.active_misconception_count` is driven by the active misconception lifecycle.
- The current model behaves like a soft TTL plus confidence decay, not a true candidate/confirmed split.
- That means phase 6 needs a schema change if candidate misconceptions are supposed to stay out of hidden prompt memory and mastery penalties until they are confirmed.

Downstream assumption:

- Moving to candidate/confirmed states will require touching every current misconception writer, plus the schema and any consumer that assumes `active` is the only trust boundary.
