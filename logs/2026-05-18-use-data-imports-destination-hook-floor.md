# useDataImportsDestination Hook Floor

Tags: tests, settings, data, imports, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-data-imports-destination.test.tsx`

New directly covered behavior:

- imports overview transport through the dedicated client helper
- fail-closed guard when saving a destination before workspace/folder selection

## Why it mattered

After extracting the destination runtime model, this adds a direct floor to the
remaining hook glue in the central import-destination coordinator.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-data-imports-destination.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-data-imports-destination.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a hook floor rather than a richer interaction test for the full
destination workflow.
