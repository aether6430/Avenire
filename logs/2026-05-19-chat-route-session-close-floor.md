# Chat Route Session-Close Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-session-close.test.ts`

Covered behavior:

- ignored `202` responses for empty/new chat close events
- deduped `202` responses when the session-close key was already seen
- `404` behavior for missing chats
- ignored `202` behavior for empty message histories
- forced session-boundary summary persistence on successful session close
- tolerance for latest-summary lookup failures while still persisting the close

## Why it mattered

The session-close path is part of the chat lifecycle and summary pipeline, but
it previously had only indirect coverage. This pass gives it a direct floor and
reduces uncertainty around chat lifecycle cleanup behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-session-close.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-session-close.test.ts src/app/api/chat/chat-route-cache.test.ts src/app/api/chat/chat-stream-store.test.ts src/app/api/chat/chat-route-persisted.test.ts src/app/api/chat/chat-route-persisted-stream.test.ts src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The core chat lifecycle server paths now have much better floors. The remaining
large chat work is more about client/runtime surfaces than these server helpers.
