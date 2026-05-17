# Use Chat Runtime Model Extraction

Tags: structure, verification

## What changed

- Extracted the pure decision layer out of
  `apps/web/src/components/chat/use-chat-runtime.ts` into:
  - `use-chat-runtime-model.ts`
  - `use-chat-runtime-model.test.ts`
- Moved runtime ownership for:
  - new-chat handoff message selection
  - auto-prompt gating
  - regeneration-request building
  - attachment-limit decisions
- Kept the side-effectful hook in place while shrinking its local behavior
  surface.

## Why it mattered

`use-chat-runtime.ts` sits on a core signed-in product path, so a full hook
split would be higher risk than some of the previous UI shell reductions. This
pass still improved codability in a meaningful way by pushing the most
important pure runtime decisions into a local model file with focused tests.

## Verification

- line counts:
  - `use-chat-runtime.ts`: `520` -> `447`
  - `use-chat-runtime-model.ts`: `177`
- `node_modules/.bin/biome check apps/web/src/components/chat/use-chat-runtime.ts apps/web/src/components/chat/use-chat-runtime-model.ts apps/web/src/components/chat/use-chat-runtime-model.test.ts apps/web/src/components/chat/chat.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/use-chat-runtime-model.test.ts src/components/chat/chat.test.tsx src/components/chat/chat-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3049 BETTER_AUTH_URL=http://127.0.0.1:3049 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The hook is materially smaller and less tangled now, but it remains one of
  the denser app-facing runtime owners and could still benefit from a future
  local split of its effect orchestration if that becomes the highest-value
  next cut.
