# Settings Navigation Hook Floor

Tags: tests, settings, navigation, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-navigation.test.tsx`

New directly covered behavior:

- visible/mobile tab derivation through the hook
- routing tab changes through the settings overlay route builder
- redundant navigation avoidance when re-selecting the current tab
- hiding keyboard shortcuts when no keyboard was detected

## Why it mattered

The runtime model already covered deterministic tab rules, but the hook itself
still had no direct floor. This pass closes the gap between the pure navigation
rules and the actual router-facing settings hook.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-navigation.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-navigation.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a hook-level floor rather than a browser-level settings tab
interaction test.
