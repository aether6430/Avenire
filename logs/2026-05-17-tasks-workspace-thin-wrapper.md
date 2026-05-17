# Tasks Workspace Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/tasks/tasks-workspace.tsx` to a thin
  wrapper around the already-existing local pieces:
  - `use-tasks-workspace.ts`
  - `tasks-workspace-surface.tsx`
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`tasks-workspace.tsx` still carried a large duplicate shell even though the
runtime and surface had already been extracted nearby. This pass made the
component reflect the actual ownership shape instead of maintaining two
parallel implementations.

## Verification

- `wc -l apps/web/src/components/tasks/tasks-workspace.tsx`
  - before: `640`
  - after: `13`
- `node_modules/.bin/biome check apps/web/src/components/tasks/tasks-workspace.tsx apps/web/src/components/tasks/tasks-workspace.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/tasks/tasks-workspace.test.tsx src/components/tasks/tasks-workspace-surface.test.tsx src/components/tasks/tasks-workspace-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3035 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3035 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but longer-lived signed-in interactive
  durability remains a product-level open requirement.
