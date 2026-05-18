# Extension Route Wrappers Floor

Tags: tests, extension, routes

## What changed

Added direct coverage for:

- `apps/web/src/app/api/extension/extension-routes.test.ts`

New directly covered behavior:

- unauthorized exit for extension routes
- delegation from top-level extension route wrappers into their dedicated
  handlers for me/workspaces/folders/destinations

## Why it mattered

The extension contour was still thin at the top-level contract layer. This pass
adds a compact route-wrapper floor without reopening test-budget problems.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/extension/extension-routes.test.ts`
- `node_modules/.bin/vitest run src/app/api/extension/extension-routes.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The broader extension surface is still larger than this wrapper pass alone.
