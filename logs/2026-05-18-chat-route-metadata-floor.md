# Chat Route Metadata Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-metadata.test.ts`

Covered behavior:

- title-model resolution from env with conservative fallback
- fallback title generation when `generateText()` returns empty output
- accepted JSON metadata parsing and icon normalization
- fallback behavior when generated metadata is weak or invalid
- abort-like error handling
- logged fallback behavior on real generation failures
- default thinking-message emission when text exists and the request is not
  aborted

Also fixed one real behavior issue:

- fallback title generation now ignores leading empty whitespace segments before
  slicing the first meaningful words

## Why it mattered

This module directly shapes visible chat UX: titles and thinking messages. It
had almost no direct floor before this pass even though it feeds the main chat
route.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-metadata.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-metadata.test.ts src/app/api/chat/chat-route-model.test.ts src/app/api/chat/chat-route-logging.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The metadata layer is much better covered now. The next chat-route follow-up is
more likely to be in route orchestration or real integration surfaces than in
these pure helpers.
