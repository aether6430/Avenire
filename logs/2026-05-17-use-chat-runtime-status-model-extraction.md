# Use Chat Runtime Status Model Extraction

Tags: structure, verification, tests

## What changed

- Extended `use-chat-runtime-model.ts` with more pure decision logic for:
  - initial-message hydration
  - persisted-stream resume gating
  - submitted-status pet notification
  - completed assistant reply detection after a streaming/submitted turn
- Updated `use-chat-runtime.ts` to consume those helpers instead of re-deriving
  the same rules inline.
- Added focused tests for the new helpers.

## Why it mattered

The first `use-chat-runtime` model extraction pulled out request-building and
attachment-limit rules. This pass pushed the next obvious decision seams out of
the hook too, which makes the status/effect logic easier to inspect and harder
to accidentally fork across future chat changes.

## Verification

- line counts:
  - `use-chat-runtime.ts`: `447` -> `445`
  - `use-chat-runtime-model.ts`: `177` -> `232`
  - `use-chat-runtime-model.test.ts`: `156`
- `node_modules/.bin/biome check apps/web/src/components/chat/use-chat-runtime.ts apps/web/src/components/chat/use-chat-runtime-model.ts apps/web/src/components/chat/use-chat-runtime-model.test.ts apps/web/src/components/chat/chat.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/use-chat-runtime-model.test.ts src/components/chat/chat.test.tsx src/components/chat/chat-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3062 BETTER_AUTH_URL=http://127.0.0.1:3062 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The hook is slightly smaller and the status rules are clearer now, but
  `use-chat-runtime.ts` remains one of the denser app-facing runtime owners.
