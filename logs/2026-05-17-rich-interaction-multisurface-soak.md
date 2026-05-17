# Rich Interaction Multi-Surface Soak

Tags: verification, ux, product, tests

## What changed

- Started a fresh detached production server on `:3022` and authenticated proxy
  on `:4022`.
- Created a real task through `POST /api/tasks`.
- Updated that task through `PATCH /api/tasks/<taskId>`.
- Added a real flashcard through
  `POST /api/flashcards/sets/<setId>/cards`.
- Reviewed that real flashcard through `POST /api/flashcards/review`.
- Captured browser-visible richer interaction state for:
  - `/workspace/tasks`
  - `/workspace/flashcards/<setId>`
- Ran a repeated mixed-route browser loop after those mutations across:
  - `/workspace`
  - `/workspace/files/...`
  - `/workspace/tasks`
  - `/workspace/chats/<slug>`
  - `/workspace/flashcards/<setId>`

## Why it mattered

The previous strongest proof showed richer persisted entities and repeated
navigation loops. This pass moved one level deeper into actual interaction:

- task creation and task update are live
- flashcard creation and review are live
- the UI reflects those mutations in non-empty states
- the detached production server still survives after that richer interaction
  layer

## Verification

- created task:
  - id: `2c93b3fb-7788-4718-8f42-ba4e519c5249`
  - title: `Rich Soak Task 2026-05-17`
- updated task:
  - status: `drafting`
  - description: `Task updated during richer production audit`
- created flashcard:
  - id: `99f99ef5-0a16-4179-a7ec-8c36ba2bb5d6`
- reviewed flashcard:
  - rating: `good`
  - state became `learning`
  - `reviewedTodayCount: 1`
- tasks route browser proof:
  - task visibly rendered under `Drafting`
  - title, description, `No date`, and `Normal` were visible
- flashcard-set browser proof:
  - set profile showed `1 cards`
  - study context showed `1 studied today`
  - in-progress count showed `1 in progress`
- post-mutation repeated loop:
  - `2` cycles
  - `10` total route navigations
- detached server health:
  - `/login` => `200` immediately after the loop
  - `/login` => `200` after `30s`

## Remaining concerns

- This is the strongest interaction proof so far, but it still stops short of
  a real method message round-trip or longer-lived interactive sessions beyond
  the repeated navigation loop.
