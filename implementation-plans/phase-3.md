# Phase 3: Concept Mastery Score

## Summary
- Add a durable concept-level mastery model derived from FSRS review data.
- Recompute mastery on every review event and misconception resolution.
- Provide a subject-scoped read model for future dashboard and drill workflows.

## Implementation Changes
- Database schema
  - Add `concept_mastery` table with:
    - `user_id`
    - `concept`
    - `subject`
    - `mastery_score`
    - `misconception_count`
    - `last_reviewed_at`
    - `updated_at`
  - Add a unique key on `user_id + concept`.
  - Add an index on `user_id + subject`.
- Mastery calculation
  - Add `updateMasteryScore(userId, concept)` in `packages/database/src/flashcard-data.ts` or a new dedicated data module.
  - Query all non-archived cards for the user whose canonical taxonomy matches the concept.
  - Join review state to collect current FSRS `stability`.
  - Compute mastery as:
    - average available stability values
    - normalized to `0..1` using a fixed application-level normalization rule
  - Also include unresolved misconception count for the same concept in the row.
  - Upsert the result into `concept_mastery`.
- Event wiring
  - Invoke mastery recomputation from the Phase 0 review-event subscriber.
  - Invoke mastery recomputation after Phase 2 misconception resolution.
  - If a concept has no review state yet, persist score `0` or skip row creation; implementation must pick one rule and use it consistently.
- Read APIs
  - Add `getMasteryBySubject(userId, subject)` returning:
    - `concept`
    - `subject`
    - `masteryScore`
    - `misconceptionCount`
    - `lastReviewedAt`
  - Add optional helper for lowest-scoring concepts to support later drill actions.

## Public Interfaces / Types
- New DB APIs:
  - `updateMasteryScore(userId, concept)`
  - `getMasteryBySubject(userId, subject)`
  - optional `getWeakestConcepts(userId, subject?, limit?)`
- New DB table:
  - `concept_mastery`

## Test Plan
- Calculation
  - Cards with stable review state produce a normalized non-null mastery score.
  - Multiple cards in the same concept aggregate correctly.
  - Concepts with unresolved misconceptions reflect the correct `misconception_count`.
- Triggers
  - Review event recomputes mastery for the reviewed concept.
  - Misconception resolution recomputes mastery after `resolved_at` is set.
- Read path
  - `getMasteryBySubject` returns only concepts for the requested subject and current user.
  - Lowest-score helper sorts ascending deterministically.

## Assumptions
- Stability is the primary mastery signal in v1.
- Mastery stays concept-level; there is no separate topic- or subject-level aggregate table in this phase.
- Historical cards missing canonical taxonomy are ignored rather than heuristically classified.
