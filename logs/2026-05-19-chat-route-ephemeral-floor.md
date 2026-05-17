# Chat Route Ephemeral Floor

Tags: tests, reliability, chat, server

## What changed

Added direct tests for:

- `apps/web/src/app/api/chat/chat-route-ephemeral.test.ts`

Covered behavior:

- initial usage-limit rejection for ephemeral chats
- multimodal ephemeral stream construction from prior messages plus the selected
  image
- tool filtering for selection inspection
- defaulting empty `selectionMediaType` to `image/png`
- request failure and server logging when stream startup throws

Also fixed one real behavior issue:

- empty `selectionMediaType` values now fail closed to the expected
  `image/png` default instead of passing an empty media type through the model
  stream

## Why it mattered

The ephemeral chat route is part of the product’s visual/selection-inspection
path and had only indirect top-level coverage. This pass gives it a direct
floor and fixes a real media-type robustness issue.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chat/chat-route-ephemeral.ts apps/web/src/app/api/chat/chat-route-ephemeral.test.ts`
- `node_modules/.bin/vitest run src/app/api/chat/chat-route-ephemeral.test.ts src/app/api/chat/chat-route-metadata.test.ts src/app/api/chat/chat-route-model.test.ts src/app/api/chat/chat-route-logging.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The ephemeral route is stronger now. The next likely chat-route follow-up would
be integration-style coverage around the full top-level POST handler when it
dispatches into the ephemeral branch, rather than more unit coverage inside the
same helper.
