# Public Route Wrapper Floor

Tags: tests, reliability, routes, public

## What changed

Added direct coverage for thin public route wrappers:

- `apps/web/src/app/api/chats/[slug]/share/chat-share-routes.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/share/workspace-resource-share-routes.test.ts`
- `apps/web/src/app/api/public-route-wrappers.test.ts`

New directly covered behavior:

- chat share route wrappers delegating grants/link/suggestions through resolved context
- workspace file/folder share route wrappers delegating through resolved context
- billing portal/usage and waitlist request wrappers delegating to their
  dedicated handlers
- early forbidden/not-found responses short-circuiting before delegation where
  applicable

## Why it mattered

The core handler flows were already stronger, but top-level route wiring still
had zero-floor spots in several public-facing API surfaces. This pass makes the
contract layer itself less dependent on trust.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/chats/[slug]/share/chat-share-routes.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/share/workspace-resource-share-routes.test.ts apps/web/src/app/api/public-route-wrappers.test.ts`
- `node_modules/.bin/vitest run src/app/api/chats/[slug]/share/chat-share-routes.test.ts src/app/api/workspaces/[workspaceUuid]/share/workspace-resource-share-routes.test.ts src/app/api/public-route-wrappers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These wrapper tests are still contract-level coverage, not a substitute for the
underlying handler and UI floors that matter more to product behavior.
