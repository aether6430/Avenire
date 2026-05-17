# Chat Route Model Floor

Tags: tests, reliability, chat, verification

## What changed

Added direct tests for the central pure helpers in:

- `apps/web/src/app/api/chat/chat-route-model.ts`
- `apps/web/src/app/api/chat/chat-route-model.test.ts`

Covered behavior:

- chat title sanitization and fallback title generation
- stripping non-http file parts
- media-type normalization on message file parts
- prompt-memory block construction and validation
- model-context trimming under configured char budgets
- model tool allow-list selection
- token and credit resolution
- persisted message ordering

Also fixed one real bug:

- `fallbackChatNameFromText()` now ignores leading empty whitespace segments
  before slicing the first six meaningful words

## Why it mattered

This file is a central deterministic model behind the main chat route, but it
had no direct floor. The route tests exercise the larger handler, not the whole
decision surface of these helpers.

This pass raises trust in the chat pipeline and caught a real correctness issue
in fallback title generation rather than just adding ceremonial coverage.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-model.ts apps/web/src/app/api/chat/chat-route-model.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-model.test.ts src/app/api/chat/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The pure model layer is stronger now. The next likely chat follow-up would be
the larger UI/runtime side (`use-chat-runtime.ts`) or the persisted-stream route
layers, which still have significant behavior without their own direct floors.
