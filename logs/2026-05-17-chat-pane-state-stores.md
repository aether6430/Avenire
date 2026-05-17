# Chat And Pane State Stores

Tags: tests, structure, reliability, state

## What changed

Strengthened two small but central client-state paths:

- `apps/web/src/stores/chat-message-handoff-store.ts`
- `apps/web/src/stores/workspaceHistoryStore.ts`

Added direct tests:

- `apps/web/src/stores/chat-message-handoff-store.test.ts`
- `apps/web/src/stores/workspaceHistoryStore.test.ts`
- `apps/web/src/stores/workspace-history-model.test.ts`

Also extracted the pure pane-history transition logic into:

- `apps/web/src/stores/workspace-history-model.ts`

Covered behavior:

- chat handoff priming / consuming / clearing
- fail-closed behavior for empty chat ids or empty message lists
- pane history dedupe
- back/forward index movement when revisiting adjacent history entries
- future-history trimming when branching to a new route

## Why it mattered

These stores are small, but they sit under two important product behaviors:

- preserving messages while a new chat route is being created
- keeping workspace-pane route history coherent

Before this pass, both areas had little or no direct coverage. Now the risky
state transitions are explicit and independently testable.

## Verification

- `node_modules/.bin/biome check apps/web/src/stores/workspace-history-model.ts apps/web/src/stores/workspace-history-model.test.ts apps/web/src/stores/workspaceHistoryStore.ts apps/web/src/stores/workspaceHistoryStore.test.ts apps/web/src/stores/chat-message-handoff-store.test.ts`
- `node_modules/.bin/vitest run src/stores/workspace-history-model.test.ts src/stores/workspaceHistoryStore.test.ts src/stores/chat-message-handoff-store.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These stores are stronger now. The next state-management follow-up would be the
remaining untested dashboard/files/chat stores, but the biggest product-facing
pressure points are now more covered than before.
