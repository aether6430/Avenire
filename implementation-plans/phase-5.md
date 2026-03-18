# Phase 5: Concept Map Dashboard

## Summary
- Expose the concept mastery model in the dashboard.
- Provide a simple weak-concept drill action backed by existing flashcard flows.
- Keep this phase frontend-focused and dependent on Phases 2-3 data contracts.

## Implementation Changes
- Dashboard data access
  - Add a subject-scoped server/data layer in `apps/web/src/lib/flashcards.ts` or a dedicated dashboard module to read:
    - mastery by subject
    - weakest concepts
  - Add an API route only if the page cannot fetch through existing server components cleanly.
- UI
  - Add a new dashboard section in the existing dashboard surface under `apps/web/src/app/dashboard` and `apps/web/src/components/dashboard`.
  - Initial visualization should be a concept grid, not a freeform graph layout.
  - Each concept card should show:
    - concept name
    - mastery score
    - misconception count
    - last reviewed time if available
  - Color encode mastery bands with an accessible legend.
- Drill flow
  - Add a “Drill my weakest concepts” action.
  - Initial behavior:
    - fetch the bottom N concepts by mastery
    - find matching cards/sets using canonical concept taxonomy
    - route the user into an existing flashcard review or generated practice flow
  - Avoid introducing a separate practice engine in this phase.
- Empty/error states
  - Handle:
    - no mastery data yet
    - concepts with no recent reviews
    - partial taxonomy coverage on older cards

## Public Interfaces / Types
- UI consumes:
  - `getMasteryBySubject(userId, subject)`
  - optional weakest-concepts helper
- If an API route is added, keep the response minimal and dashboard-specific.

## Test Plan
- Rendering
  - Dashboard renders concept cards with correct score bands and counts.
  - Empty state appears for users without mastery records.
- Drill action
  - Clicking weakest-concepts action selects lowest-score concepts deterministically.
  - Drill flow only includes cards with canonical matching concept taxonomy.
- Compatibility
  - Dashboard does not crash when some legacy cards lack taxonomy data.

## Assumptions
- V1 uses a grid/list visualization instead of a spatial graph.
- Weakest-concept drill should reuse existing flashcard infrastructure.
- Subject selection/filtering may be required in the UI if users have multiple subjects with mastery data.
