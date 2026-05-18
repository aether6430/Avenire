# Data Imports Composition Floor

Tags: tests, ux, settings, data

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/data-imports-section.test.tsx`
- `apps/web/src/components/settings/data-imports-source-picker.test.tsx`

New directly covered behavior:

- section-level composition from `useDataImports(...)` into `DataImportsSurface`
- visible data-import source options and provider status labels

## Why it mattered

The data-imports surface already had lower-level tests, but these small
composition/visibility tests tighten one more layer of the user-facing import
experience without introducing a lot of churn.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/data-imports-section.test.tsx apps/web/src/components/settings/data-imports-source-picker.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/data-imports-section.test.tsx src/components/settings/data-imports-source-picker.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a thin composition/render floor rather than an interactive import
workflow floor.
