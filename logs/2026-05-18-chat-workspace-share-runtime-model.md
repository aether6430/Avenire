# Chat Workspace Share Runtime Model

Tags: tests, structure, ux, sharing

## What changed

Extracted deterministic share-workflow transitions from:

- `apps/web/src/components/dashboard/use-chat-workspace-share.ts`

into:

- `apps/web/src/components/dashboard/chat-workspace-share-runtime-model.ts`
- `apps/web/src/components/dashboard/chat-workspace-share-runtime-model.test.ts`

New directly covered behavior:

- can-share gating for readonly/new chats
- share-suggestions visibility gating
- reset state for the share dialog
- successful and failed email-share transitions
- successful and failed share-link generation transitions
- successful and failed copy-link transitions

## Why it mattered

This is a stronger step than a thin wrapper test because it reduces live
user-facing share logic inside the hook itself while also giving the share
workflow a direct floor around its core state transitions.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/chat-workspace-share-runtime-model.ts apps/web/src/components/dashboard/chat-workspace-share-runtime-model.test.ts apps/web/src/components/dashboard/use-chat-workspace-share.ts`
- `node_modules/.bin/vitest run src/components/dashboard/chat-workspace-share-runtime-model.test.ts src/components/dashboard/chat-workspace-model.test.ts src/components/dashboard/chat-workspace-share-data.test.ts src/components/dashboard/chat-workspace-share-dialog-copy.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The hook now holds less hidden logic, but it still does not have a full
interactive browser-level floor for the entire dialog workflow.
