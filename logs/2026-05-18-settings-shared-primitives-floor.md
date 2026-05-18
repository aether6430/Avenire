# Settings Shared Primitives Floor

Tags: tests, ui, settings

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-panel-content-shared.test.tsx`

New directly covered behavior:

- `Section` description rendering vs omission
- `Divider` rendering
- `UsageStatCard` visible label/value/description rendering
- `ToggleRow` visible label/description/checked state
- `PlanCard` current-plan vs upgrade CTA rendering

## Why it mattered

These shared primitives shape several settings surfaces at once. A small floor
here helps keep the settings UI coherent as higher-level sections evolve.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-panel-content-shared.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-panel-content-shared.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is a primitive-level UI floor, not a replacement for the broader settings
section and shell coverage above it.
