# Rolling Reasoning Ownership Split

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/chat/rolling-reasoning.tsx` to a thin
  export surface.
- Split the old mixed-responsibility file into local owners:
  - `rolling-reasoning-provider.tsx`
  - `rolling-reasoning-content.tsx`
  - `rolling-reasoning-action.tsx`
  - `rolling-reasoning-shared.tsx`
- Added a focused reasoning test covering:
  - a non-streaming reasoning action
  - provider-backed trigger copy from a supplied duration
  - the running status-header path

## Why it mattered

The old reasoning file mixed provider state, trigger text, rolling content
rendering, action-panel behavior, preview panel behavior, and shared constants
in one place. This pass made the public file honest while keeping the local
reasoning cluster easier to change correctly and independently.

## Verification

- line counts:
  - `rolling-reasoning.tsx`: `578` -> `20`
  - `rolling-reasoning-provider.tsx`: `170`
  - `rolling-reasoning-content.tsx`: `75`
  - `rolling-reasoning-action.tsx`: `281`
  - `rolling-reasoning-shared.tsx`: `73`
- `node_modules/.bin/biome check apps/web/src/components/chat/rolling-reasoning.tsx apps/web/src/components/chat/rolling-reasoning-provider.tsx apps/web/src/components/chat/rolling-reasoning-content.tsx apps/web/src/components/chat/rolling-reasoning-action.tsx apps/web/src/components/chat/rolling-reasoning-shared.tsx apps/web/src/components/chat/rolling-reasoning.test.tsx apps/web/src/components/chat/rolling-tool-activity.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/rolling-reasoning.test.tsx src/components/chat/message-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3048 BETTER_AUTH_URL=http://127.0.0.1:3048 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root reasoning shell is now small and honest, but broader structural
  pressure still remains in `particle-field.tsx`, `use-chat-runtime.ts`,
  `markdown-renderers.tsx`, and the explorer/files cluster.
