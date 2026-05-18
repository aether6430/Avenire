# Imports API Floor

Tags: tests, imports, routes, settings

## What changed

Added direct coverage for:

- `apps/web/src/app/api/imports/imports-route-model.test.ts`
- `apps/web/src/app/api/imports/imports-execution-route-model.test.ts`
- `apps/web/src/app/api/imports/imports-routes.test.ts`

New directly covered behavior:

- import destination payload parsing
- import execution payload parsing
- route error mapping
- import providers overview transport
- Notion pages transport
- import destination validation and persistence

## Why it mattered

Imports were still one of the clearest weak spots in the audit. This pass adds
direct floors both on the route-model layer and on a few core import handlers in
the settings data contour.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/imports/imports-route-model.test.ts apps/web/src/app/api/imports/imports-execution-route-model.test.ts apps/web/src/app/api/imports/imports-routes.test.ts`
- `node_modules/.bin/vitest run src/app/api/imports/imports-route-model.test.ts src/app/api/imports/imports-execution-route-model.test.ts src/app/api/imports/imports-routes.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This still does not fully cover every imports route and every imports UI step,
but it meaningfully tightens one of the weakest API contours from the audit.
