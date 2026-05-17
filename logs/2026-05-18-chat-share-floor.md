# Chat Share Floor

Tags: tests, reliability, sharing, public

## What changed

Added direct coverage for the public-facing chat sharing slice:

- `apps/web/src/app/api/chats/[slug]/share/chat-share-route-model.test.ts`
- `apps/web/src/app/api/chats/[slug]/share/chat-share-route-context.test.ts`
- `apps/web/src/app/api/chats/[slug]/share/chat-share-route-handlers.test.ts`

New directly covered behavior:

- canonical public share URL building
- trimmed/fail-closed grant email parsing
- unauthorized, missing-chat, read-only, and missing-workspace context exits
- successful share-context hydration for owned chats
- public share-link creation and success logging
- fail-closed missing-email grant rejection
- successful viewer-grant creation
- missing-user grant rejection
- share-suggestions query handling and success logging

## Why it mattered

Chat sharing is part of the product’s public-facing surface, and before this
pass the slice had zero direct floor. That left important access-control and
sharing behavior unproven exactly where public-ready reliability matters.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chats/[slug]/share/chat-share-route-model.test.ts apps/web/src/app/api/chats/[slug]/share/chat-share-route-context.test.ts apps/web/src/app/api/chats/[slug]/share/chat-share-route-handlers.test.ts`
- `node_modules/.bin/vitest run src/app/api/chats/[slug]/share/chat-share-route-model.test.ts src/app/api/chats/[slug]/share/chat-share-route-context.test.ts src/app/api/chats/[slug]/share/chat-share-route-handlers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This floor covers the internal share slice directly, but not the thin route
wrappers above it. If we continue in sharing, the next strongest follow-up
would be the equivalent workspace file/folder share paths.
