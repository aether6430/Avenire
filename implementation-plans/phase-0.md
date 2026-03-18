# Phase 0: Foundations

## Summary
- Make flashcard taxonomy reliable before any retrieval or misconception work.
- Add an internal FSRS review event surface around the existing review flow.
- Add lightweight subject detection usable by chat and flashcard generation paths.

## Implementation Changes
- Flashcard taxonomy
  - Treat `subject`, `topic`, and `concept` as required canonical fields for all newly created cards.
  - Persist canonical taxonomy in `flashcard_card.source` as:
    - `source.subject: string`
    - `source.topic: string`
    - `source.concept: string`
  - Keep `flashcard_card.tags` for user-facing labels and filtering, but do not depend on it for backend joins or misconception logic.
  - Update both manual card creation and AI-generated card creation paths to reject writes missing canonical taxonomy.
  - Primary entrypoints:
    - `packages/database/src/flashcard-data.ts`
    - `apps/web/src/lib/chat-tools/index.ts`
    - `apps/web/src/app/api/flashcards/sets/[setId]/cards/route.ts`
- Shared taxonomy helpers
  - Add a small shared helper in `packages/database` or `apps/web/src/lib` to:
    - read canonical taxonomy from `source`
    - normalize casing/whitespace
    - derive fallback display tags from canonical taxonomy
  - Do not add new DB columns or new taxonomy tables in this phase.
- FSRS review event hook
  - Add an internal review-event publisher around `reviewFlashcardForUser`.
  - Emit exactly one event after the transaction commits successfully.
  - Event payload should include:
    - `userId`
    - `workspaceId`
    - `cardId`
    - `setId`
    - `rating`
    - `reviewedAt`
    - `previousState`
    - `nextState`
    - `stability`
    - canonical `subject/topic/concept`
  - Keep this as an in-process application hook, not an external queue or event bus.
- Subject detection
  - Add a lightweight classifier helper for chat/retrieval flows.
  - First implementation may combine:
    - explicit flashcard taxonomy when available
    - keyword heuristics for common subjects
    - optional low-cost model classification when heuristics fail
  - Return a bounded result:
    - `subject: string | null`
    - `confidence: number`
    - `source: "taxonomy" | "heuristic" | "llm" | "none"`

## Public Interfaces / Types
- Require canonical flashcard taxonomy in creation/update surfaces for new cards:
  - `source.subject`
  - `source.topic`
  - `source.concept`
- Add internal `FlashcardReviewEvent` type for downstream misconception/mastery consumers.
- Add internal `detectSubject(input)` helper contract for chat and retrieval callers.

## Test Plan
- Flashcard creation
  - AI-generated deck creation writes canonical taxonomy to every card.
  - Manual card creation route rejects cards missing one or more canonical taxonomy fields.
  - Taxonomy normalization trims whitespace and prevents empty strings.
- Review events
  - One review call emits exactly one event after successful commit.
  - Failed review writes do not emit an event.
  - Event payload includes the expected taxonomy and scheduler state fields.
- Subject detection
  - Known queries map to expected subjects through heuristic matching.
  - Unknown queries return `subject: null` or low confidence instead of forced guesses.

## Assumptions
- Existing `flashcard_card.source` JSON is the canonical storage location for taxonomy.
- Existing `tags` remain supported and backward compatible.
- Historical cards are not backfilled in this phase; downstream phases must tolerate missing taxonomy on legacy rows.
