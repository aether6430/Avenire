# Rich State Multi-Surface Soak

Tags: verification, ux, product, tests

## What changed

- Started a fresh detached production server on `:3021` and authenticated proxy
  on `:4021`.
- Created a real persisted method through `POST /api/chats`.
- Created a real persisted mindset set through `POST /api/flashcards/sets`.
- Captured real signed-in browser renders for:
  - `/workspace/chats/<slug>`
  - `/workspace/flashcards/<setId>`
- Ran a repeated mixed-route browser loop across:
  - `/workspace`
  - `/workspace/files/...`
  - `/workspace/tasks`
  - `/workspace/chats/<slug>`
  - `/workspace/flashcards/<setId>`

## Why it mattered

The biggest remaining audit gap had shifted from basic route reachability to
whether the product stayed healthy during richer signed-in usage. This pass
proved more than empty-state shells:

- persisted chat state renders
- persisted flashcard-set state renders
- a repeated mixed signed-in session across the main route families can survive
  without immediately poisoning the detached production server

## Verification

- created chat:
  - title: `Rich Soak Method 2026-05-17`
  - slug: `ca4a56e3-6482-47f6-822f-56f4d66d69ad`
- created flashcard set:
  - title: `Rich Soak Set 2026-05-17`
  - id: `654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- direct route proof:
  - `/workspace/chats/ca4a56e3-6482-47f6-822f-56f4d66d69ad`
  - `/workspace/flashcards/654bbf5c-4d98-4a26-acbf-55bc9482bd3f`
- richer-state repeated loop:
  - `3` cycles
  - `15` total route navigations
- detached server health:
  - `/login` => `200` immediately after the loop
  - `/login` => `200` after `30s`

## Remaining concerns

- This is the strongest signed-in durability proof so far, but it still stops
  short of message-send flows, flashcard-card creation/review, or longer-lived
  sessions beyond the repeated navigation loop.
