# Chat Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/chat/chat.tsx` to a thin wrapper around the
  already-existing local pieces:
  - `use-chat-runtime.ts`
  - `chat-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`chat.tsx` had kept a large duplicate shell even though the runtime and surface
were already extracted nearby. This pass made the component reflect the real
ownership shape instead of maintaining two parallel implementations.

## Verification

- `wc -l apps/web/src/components/chat/chat.tsx`
  - before: `688`
  - after: `44`
- `node_modules/.bin/biome check apps/web/src/components/chat/chat.tsx apps/web/src/components/chat/chat.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/chat.test.tsx src/components/chat/chat-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3034 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3034 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but successful provider-backed method
  responses are still environment-blocked by missing local model keys.
