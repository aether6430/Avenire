# Data Import Destination Runtime Model

Tags: tests, structure, settings, data, imports

## What changed

Extracted deterministic destination helpers from:

- `apps/web/src/components/settings/use-data-imports-destination.ts`

into:

- `apps/web/src/components/settings/settings-data-imports-destination-runtime-model.ts`
- `apps/web/src/components/settings/settings-data-imports-destination-runtime-model.test.ts`

New directly covered behavior:

- overview load start / success / failure state derivation
- folder-load reset / start / success / failure state derivation
- folder-selection reconciliation after folder loads
- destination reuse detection before saving again

## Why it mattered

This is the main coordinator for import-destination state. Pulling the
deterministic transitions out of the hook makes the imports surface easier to
reason about and safer to change.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-data-imports-destination-runtime-model.ts apps/web/src/components/settings/settings-data-imports-destination-runtime-model.test.ts apps/web/src/components/settings/use-data-imports-destination.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-data-imports-destination-runtime-model.test.ts src/components/settings/data-imports-model.test.ts src/components/settings/data-imports-section.test.tsx src/components/settings/data-imports-source-picker.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The destination hook now carries less hidden deterministic logic, but it still
does not have a full interactive workflow floor for the complete import setup
experience.
