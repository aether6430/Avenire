# Dashboard Home Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/dashboard/dashboard-home.tsx` to a thin
  wrapper around the already-existing local pieces:
  - `use-dashboard-home.ts`
  - `dashboard-home-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`dashboard-home.tsx` still carried a large duplicate shell even though the
runtime and surface had already been extracted nearby. This pass made the
component reflect the actual ownership shape instead of maintaining two
parallel implementations.

## Verification

- `wc -l apps/web/src/components/dashboard/dashboard-home.tsx`
  - before: `814`
  - after: `18`
- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-home.tsx apps/web/src/components/dashboard/dashboard-home.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/dashboard/dashboard-home.test.tsx src/components/dashboard/dashboard-home-panels.test.tsx src/components/dashboard/dashboard-home-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3037 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3037 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but the successful provider-backed
  method path and longer-lived signed-in durability remain broader product
  gaps.
