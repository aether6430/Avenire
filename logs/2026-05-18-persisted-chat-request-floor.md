# Persisted Chat Request Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-persisted.test.ts`

Covered behavior:

- duplicate-request detection for new-chat idempotency keys
- successful new-chat creation and delegation to the persisted stream builder
- normalized user-message persistence before stream startup
- initial chat usage limit handling with idempotency-key cleanup
- user-message persistence failure handling with idempotency-key cleanup

## Why it mattered

The persisted-chat route stack now had internal floors for context loading,
model stream creation, finish handling, and stream wrapping, but the top-level
request orchestrator still lacked a direct floor of its own.

This pass closes that gap and gives the main persisted-chat request path more
trust from the top down.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-persisted.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-persisted.test.ts src/app/api/chat/chat-route-persisted-stream.test.ts src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The persisted-chat server path is now covered at several internal layers. The
next server-side chat follow-up, if we stay here, would likely be the resumable
stream storage branch under real Redis-enabled conditions rather than more unit
coverage on the same non-network logic.
