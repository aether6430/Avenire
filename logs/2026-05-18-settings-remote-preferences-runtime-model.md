# Settings Remote Preferences Runtime Model

Tags: tests, structure, settings, preferences

## What changed

Extracted deterministic remote-preferences helpers from:

- `apps/web/src/components/settings/use-settings-panel-remote-preferences.ts`

into:

- `apps/web/src/components/settings/settings-remote-preferences-runtime-model.ts`
- `apps/web/src/components/settings/settings-remote-preferences-runtime-model.test.ts`

New directly covered behavior:

- preferences warm-load gating for preferences/billing tabs
- load start / success / failure state derivation
- save start / success state derivation
- stable defaults for remote preference state

## Why it mattered

This removes more hidden deterministic branching from a user-facing settings
hook and makes the remote-preferences contour easier to reason about and change
safely.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-remote-preferences-runtime-model.ts apps/web/src/components/settings/settings-remote-preferences-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-remote-preferences.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-remote-preferences-runtime-model.test.ts src/components/settings/settings-preferences-section.test.tsx src/components/settings/settings-billing-section.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The hook now hides less deterministic logic, but the broader settings runtime
still remains a larger contour than this seam alone.
