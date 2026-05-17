# Chat Workspace Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/dashboard/chat-workspace.tsx` to a thin
  wrapper around the already-existing local pieces:
  - `use-chat-workspace.ts`
  - `chat-workspace-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`chat-workspace.tsx` still carried a large duplicate shell even though the
runtime and surface had already been extracted nearby. This pass made the
component reflect the actual ownership shape instead of maintaining two
parallel implementations.

## Verification

- `wc -l apps/web/src/components/dashboard/chat-workspace.tsx`
  - before: `458`
  - after: `11`
- `node_modules/.bin/biome check apps/web/src/components/dashboard/chat-workspace.tsx apps/web/src/components/dashboard/chat-workspace.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/dashboard/chat-workspace.test.tsx src/components/dashboard/chat-workspace-model.test.ts src/components/dashboard/chat-workspace-share-dialog-copy.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3040 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3040 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but the successful provider-backed
  method path and longer-lived signed-in durability remain broader product
  gaps.
