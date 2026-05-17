# Persisted Chat Model Stream Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-persisted-model-stream.test.ts`

Covered behavior:

- selected-model and provider-model wiring
- tool creation and allow-list filtering before `streamText`
- prompt-memory block injection into `APOLLO_PROMPT`
- timeout fallback for cached learning prompt memory
- logging of streamed tool-call / tool-result chunks
- active stream cleanup and request-failure reporting when stream startup fails

## Why it mattered

The persisted-chat server path is a critical orchestration flow, and
`chat-route-persisted-model-stream.ts` sat in the middle of that path without a
direct floor. This pass increases trust in the model-stream startup path without
having to reach it only through the outer route handler.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-persisted-model-stream.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-persisted-model-stream.test.ts src/app/api/chat/chat-route-persisted-context.test.ts src/app/api/chat/chat-route-persisted-finish.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The persisted-chat route stack is much better covered now. The next high-value
server-side follow-up, if we stay in this area, would be the larger
`chat-route-persisted-stream.ts` wrapper that stitches startup, title streaming,
thinking messages, resumable stream creation, and failure persistence together.
