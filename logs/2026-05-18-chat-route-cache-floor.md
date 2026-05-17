# Chat Route Cache Floor

Tags: tests, reliability, chat, server, cache

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-cache.test.ts`

Covered behavior:

- session-close key construction
- session-close Redis marking with fail-open behavior
- learning-context cache key construction
- process-cache reuse for learning prompt memory blocks
- valid Redis cache payload reuse for learning prompt memory
- idempotency key hashing
- idempotency lock acquisition
- idempotency state reads
- idempotency completion writes
- idempotency cleanup deletes

## Why it mattered

`chat-route-cache.ts` sits under multiple important chat-server behaviors:
session-close dedupe, prompt-memory reuse, and idempotency coordination. Before
this pass it had very little direct proof of behavior.

This checkpoint hardens a low-level but high-leverage reliability layer in the
chat request path.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-cache.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-cache.test.ts src/app/api/chat/chat-stream-store.test.ts src/app/api/chat/chat-route-persisted.test.ts src/app/api/chat/chat-route-persisted-stream.test.ts src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The persisted chat path is now much more directly covered at both high and low
levels. If we stay in this area, the next follow-up would likely be broader
integration coverage around Redis-enabled resumable streaming rather than more
unit floors on the same logic.
