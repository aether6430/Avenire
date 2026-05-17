# Chat Stream Store Floor

Tags: tests, reliability, chat, server, state

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-stream-store.test.ts`

Covered behavior:

- fail-closed behavior when `REDIS_URL` is absent
- redis client/subscriber initialization and reuse
- active stream id reads and writes
- conditional active-stream clearing via Redis `EVAL`
- read/write/clear error handling after configuration exists
- explicit failure when configured client initialization still returns null

## Why it mattered

`chat-stream-store.ts` is small, but it sits directly under resumable chat
continuity and stale-stream protection. Before this pass it had no direct floor.

Now the low-level stream-id storage behavior is independently verified, which
helps the larger persisted-chat stack feel less fragile.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-stream-store.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-stream-store.test.ts src/app/api/chat/chat-route-persisted.test.ts src/app/api/chat/chat-route-persisted-stream.test.ts src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The resumable chat stack is better covered now. The next highest-value chat work
is likely back on the client side: the remaining large hook shells or UI
surfaces that still have little or no direct floors.
