# Settings Navigation Runtime Model

Tags: tests, structure, settings, navigation

## What changed

Extracted deterministic navigation helpers from:

- `apps/web/src/components/settings/use-settings-panel-navigation.ts`

into:

- `apps/web/src/components/settings/settings-navigation-runtime-model.ts`
- `apps/web/src/components/settings/settings-navigation-runtime-model.test.ts`

New directly covered behavior:

- local-tab sync gating
- redirect gating away from keyboard shortcuts when no keyboard is detected
- visible/mobile tab derivation based on keyboard availability

## Why it mattered

This keeps another small but important piece of settings navigation logic out of
the hook body and gives the tab-routing behavior a direct floor before push.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-navigation-runtime-model.ts apps/web/src/components/settings/settings-navigation-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-navigation.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-navigation-runtime-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a deterministic navigation floor, not a full browser-level test
of settings tab transitions.
