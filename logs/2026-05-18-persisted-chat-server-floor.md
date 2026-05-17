# Persisted Chat Server Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for two critical persisted-chat server modules:

- `apps/web/src/app/api/chat/chat-route-persisted-context.test.ts`
- `apps/web/src/app/api/chat/chat-route-persisted-finish.test.ts`

Covered behavior:

- workspace subject summary loading and subject/topic derivation
- fail-closed startup context behavior when subject-summary loading fails
- startup timeout fallback behavior
- persisted stream finish success path:
  - message persistence
  - summary persistence
  - token-based usage metering
  - idempotency completion
  - active stream cleanup
- stale stream skip path with cleanup still enforced

## Why it mattered

The main chat route had some higher-level tests, but these persisted-chat
modules did not have their own direct floor even though they sit on the core
server-side success path for chat continuity and billing.

This pass increases trust in the persisted-chat path without having to drive
everything through the top-level route handler.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-persisted-context.test.ts apps/web/src/app/api/chat/chat-route-persisted-finish.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The persisted-chat server path is stronger now. The next high-value server-side
follow-up would likely be `chat-route-persisted-stream.ts` or
`chat-route-persisted-model-stream.ts`, which still contain important
orchestration without their own direct floors.
