# Phase 2: Misconception Engine

## Summary
- Capture misconceptions from two signals:
  - model tool calls during chat
  - repeated failing FSRS reviews
- Inject active misconceptions into the existing all-chat flow.
- Resolve misconceptions through positive review streaks.

## Implementation Changes
- Database schema
  - Add `misconceptions` table with:
    - `id`
    - `user_id`
    - `concept`
    - `subject`
    - `topic`
    - `reason`
    - `source`
    - `confidence`
    - `resolved_at`
    - `created_at`
    - `updated_at`
  - Add indexes for:
    - unresolved misconceptions by `user_id + subject`
    - unresolved misconceptions by `user_id + concept`
  - Keep unresolved/upsert semantics in app logic rather than DB triggers.
- Tool-call capture
  - Add `log_misconception` to the chat tool registry in `packages/ai/tools/index.ts` and `apps/web/src/lib/chat-tools/index.ts`.
  - Tool payload:
    - `concept`
    - `reason`
    - `subject`
    - `topic`
    - `confidence`
  - Handler behavior:
    - if an unresolved row exists for `userId + concept`, update confidence and `updated_at`
    - otherwise insert a new unresolved row
  - Update the chat system prompt in `packages/ai/prompts/chat.ts` to describe when this tool should be used.
- FSRS signal capture
  - Subscribe the misconception logic to the Phase 0 review event hook.
  - On two consecutive `again` ratings for the same card, upsert a misconception with:
    - `source = "fsrs_signal"`
    - initial confidence default `0.6`
  - Resolve taxonomy from canonical flashcard `source`.
  - Do not infer concept from free-text card bodies when canonical taxonomy is missing.
- Injection into chat
  - Add `getActiveMisconceptions(userId, subject)` in `packages/database`.
  - Call this from the existing `/api/chat` flow before prompt assembly.
  - Inject up to 5 unresolved misconceptions as system context with the instruction:
    - address naturally if relevant
    - do not announce them unless the user’s question surfaces them
  - If subject detection is low-confidence, skip injection rather than over-injecting noise.
- Resolution
  - Use the same review-event hook to detect three consecutive `good` or `easy` ratings on cards mapped to the same concept.
  - Mark matching unresolved misconceptions as resolved by setting `resolved_at`.
  - Trigger mastery recomputation for the concept after each resolution and each review event.

## Public Interfaces / Types
- New tool:
  - `log_misconception({ concept, reason, subject, topic, confidence })`
- New DB APIs:
  - `upsertMisconception(...)`
  - `getActiveMisconceptions(userId, subject)`
  - `resolveMisconceptionsForConcept(userId, concept, resolvedAt)`
- New prompt context block injected into `/api/chat`.

## Test Plan
- Tool path
  - Tool call inserts a new unresolved misconception.
  - Repeated tool call for the same concept updates existing unresolved row instead of duplicating.
- FSRS path
  - Two consecutive `again` reviews on the same concept create or update a misconception.
  - Mixed ratings do not falsely create a misconception.
- Injection
  - High-confidence subject detection injects unresolved misconceptions into chat system context.
  - Low-confidence subject detection skips injection.
  - Injection is capped at 5 records.
- Resolution
  - Three consecutive `good/easy` reviews resolve matching unresolved misconceptions.
  - Already resolved rows stay resolved.

## Assumptions
- Misconception capture applies to the existing `/api/chat` flow rather than a separate tutor product surface.
- `concept` is the primary identity key for misconception records; `subject` and `topic` are descriptive and filtering fields.
- Confidence updates can be additive or max-based, but the implementation must choose one rule and apply it consistently everywhere.
