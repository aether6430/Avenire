# useDataImports Floor

Tags: tests, settings, data, composition

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-data-imports.test.tsx`

New directly covered behavior:

- composition of destination runtime through `useDataImportsDestination(...)`
- selected-source state booting to `null`

## Why it mattered

This rounds out the data-imports contour with a direct floor on the small hook
that composes selection state and destination runtime for the visible surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-data-imports.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-data-imports.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a small composition floor rather than a deep interaction test for
the full import workflow.
