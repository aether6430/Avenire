# Workspace Share Route Floor

Tags: tests, reliability, sharing, routes

## What changed

Added direct coverage for the top-level workspace share routes:

- `apps/web/src/app/api/workspaces/[workspaceUuid]/share/members/route.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/share/team/route.test.ts`

New directly covered behavior:

- unauthorized and forbidden exits before route-handler delegation
- GET/POST/DELETE delegation for workspace member sharing through the resolved
  route context
- POST delegation for workspace team sharing through the resolved route context

## Why it mattered

The underlying sharing handlers were already stronger, but the top-level route
contracts still had no direct floor. This pass makes the public collaboration
entrypoints less dependent on trust in wrapper wiring.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/workspaces/[workspaceUuid]/share/members/route.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/share/team/route.test.ts`
- `node_modules/.bin/vitest run src/app/api/workspaces/[workspaceUuid]/share/members/route.test.ts src/app/api/workspaces/[workspaceUuid]/share/team/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These route-wrapper tests strengthen top-level contracts, but they do not
replace the more product-relevant handler tests beneath them.
