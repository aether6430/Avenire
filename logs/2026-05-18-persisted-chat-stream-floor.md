# Persisted Chat Stream Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-persisted-stream.test.ts`

Covered behavior:

- active stream replacement and previous-stream cleanup
- streaming of `data-chatCreated`
- default thinking-message emission
- async upgraded thinking-message emission
- generated chat-title event streaming and persistence
- wiring of `toUIMessageStream` finish handling
- failed-stream persistence through `onError`
- active stream/idempotency cleanup on failed streams
- no-body response cleanup path
- Redis-enabled resumable stream context creation
- resumable stream creation failure cleanup/logging path

## Why it mattered

This wrapper stitches together a large part of the persisted-chat server flow:
startup context, thinking messages, title generation, model stream startup,
failure persistence, and resumable response setup. It is one of the most
important orchestration layers in the chat product path.

The persisted-chat stack now has direct floors at the context layer, finish
layer, model-stream layer, and this wrapper layer.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-persisted-stream.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-persisted-stream.test.ts src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The persisted-chat server stack is now much better covered. A future follow-up
in this area would be broader integration-style validation against a real Redis
or resumable-stream environment rather than the mocked infrastructure used here.
