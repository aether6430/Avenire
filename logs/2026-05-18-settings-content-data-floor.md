# Settings Content And Data Floor

Tags: tests, ux, settings, navigation, data

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-panel-content.test.tsx`
- `apps/web/src/components/settings/settings-misc-sections.test.tsx`

New directly covered behavior:

- tab-to-section routing through the settings content shell
- security/workspace shells receiving their specialized props
- data-imports and retention surface rendering
- shortcuts empty search state
- grouped shortcuts rendering when matches exist

## Why it mattered

This is the composition layer that makes settings feel like one coherent control
surface instead of a pile of isolated sections. The new tests improve trust in
how tabs actually map to visible content and how the data/shortcuts tabs present
themselves to users.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-panel-content.test.tsx apps/web/src/components/settings/settings-misc-sections.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-panel-content.test.tsx src/components/settings/settings-misc-sections.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are still render-layer floors. The effect-driven hooks beneath the data
tab and the broader settings runtime remain deeper follow-up territory.
