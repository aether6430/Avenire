# Extension Route Handlers Floor

Tags: tests, extension, api, handlers

## What changed

Added direct coverage for:

- `apps/web/src/app/api/extension/extension-route-handlers.test.ts`

New directly covered behavior:

- extension `me` response passthrough
- extension workspaces loading and failure mapping
- extension folder loading with forbidden/missing-folder paths
- extension destination create/update/delete handler behavior

## Why it mattered

After closing extension model/context and wrapper layers, this pass gives the
actual handler paths a direct floor too, which meaningfully strengthens one of
the most obvious previously untested API contours.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/extension/extension-route-handlers.test.ts`
- `node_modules/.bin/vitest run src/app/api/extension/extension-route-handlers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The broader extension surface is still larger than this handler layer alone.
