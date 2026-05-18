# Extension Route Floor

Tags: tests, extension, api, routes

## What changed

Added direct coverage for:

- `apps/web/src/app/api/extension/extension-route-model.test.ts`
- `apps/web/src/app/api/extension/extension-route-context.test.ts`

New directly covered behavior:

- extension destination payload parsing
- extension route error mapping
- workspace accessibility resolution
- editable folder resolution
- owned preset resolution

## Why it mattered

The extension API contour was still one of the most obvious zero-floor areas in
the audit. This pass starts tightening it at the model/context layer where
several extension routes converge.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/extension/extension-route-model.test.ts apps/web/src/app/api/extension/extension-route-context.test.ts`
- `node_modules/.bin/vitest run src/app/api/extension/extension-route-model.test.ts src/app/api/extension/extension-route-context.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is the start of the extension contour, not the whole thing.
