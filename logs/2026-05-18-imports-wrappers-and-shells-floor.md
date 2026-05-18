# Imports Wrappers And Shells Floor

Tags: tests, imports, routes, settings

## What changed

Added direct coverage for:

- `apps/web/src/app/api/imports/imports-route-wrappers.test.ts`
- `apps/web/src/components/settings/data-imports-step-shells.test.tsx`

New directly covered behavior:

- unauthorized exits for top-level imports route wrappers
- delegation from wrappers into providers/destination/pages/picker/import handlers
- composition of destination runtime into Google and Notion step shells

## Why it mattered

This strengthens one more layer above the imports handlers and step components,
reducing implicit trust in the top-level route and shell wiring.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/imports/imports-route-wrappers.test.ts apps/web/src/components/settings/data-imports-step-shells.test.tsx`
- `node_modules/.bin/vitest run src/app/api/imports/imports-route-wrappers.test.ts src/components/settings/data-imports-step-shells.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This still does not fully close the broader imports and extension surfaces.
