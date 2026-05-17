# Chat Scroll Model Extraction

Tags: structure, verification

## What changed

- Extracted the pure scroll-policy layer out of `use-chat-scroll.ts` into:
  - `chat-scroll-model.ts`
- Added focused tests for the new local model:
  - `chat-scroll-model.test.ts`

## Why it mattered

`use-chat-scroll.ts` sits in the core signed-in chat path, but part of its size
was really pure math and decision policy:

- bottom-distance and near-bottom calculations
- selector escaping
- CSS metric derivation
- auto-scroll toggle rules
- keyboard intent detection

This pass keeps the hook as the owner of browser effects and listeners while
moving the policy layer into a directly testable local model.

## Verification

- line counts:
  - `use-chat-scroll.ts`: `434` -> `409`
  - `chat-scroll-model.ts`: `79`
  - `chat-scroll-model.test.ts`: `67`
- `node_modules/.bin/biome check apps/web/src/components/chat/chat-scroll-model.ts apps/web/src/components/chat/chat-scroll-model.test.ts apps/web/src/components/chat/use-chat-scroll.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/chat-scroll-model.test.ts src/components/chat/chat.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3065 BETTER_AUTH_URL=http://127.0.0.1:3065 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- `use-chat-scroll.ts` is now smaller and more explicit, but it still owns the
  real browser-side resize, scroll, and listener orchestration in the chat
  runtime.
