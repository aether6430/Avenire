# Flashcards Sidebar Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/flashcards/sidebar-panel.tsx` to a thin
  wrapper around the already-existing local pieces:
  - `use-flashcards-sidebar-panel.ts`
  - `flashcards-sidebar-panel-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`sidebar-panel.tsx` still carried a large duplicate shell even though the
runtime and surface had already been extracted nearby. This pass made the
component reflect the actual ownership shape instead of maintaining two
parallel implementations.

## Verification

- `wc -l apps/web/src/components/flashcards/sidebar-panel.tsx`
  - before: `487`
  - after: `11`
- `node_modules/.bin/biome check apps/web/src/components/flashcards/sidebar-panel.tsx apps/web/src/components/flashcards/sidebar-panel.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/flashcards/sidebar-panel.test.tsx src/components/flashcards/flashcards-sidebar-panel-surface.test.tsx src/components/flashcards/flashcards-sidebar-panel-model.test.ts src/components/flashcards/flashcards-sidebar-panel-client.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3038 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3038 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but the successful provider-backed
  method path and longer-lived signed-in durability remain broader product
  gaps.
