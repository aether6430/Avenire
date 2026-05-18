# Settings Preferences Hook Floor

Tags: tests, settings, preferences, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-preferences.test.tsx`

New directly covered behavior:

- composition of local chat-send mode with remote preferences runtime
- forwarding the current tab into the remote preferences hook

## Why it mattered

The preferences surface already had section-level and runtime-model floors, but
this hook still had no direct coverage of its local-storage + remote-preferences
composition role.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-preferences.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-preferences.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a hook composition floor, not a browser-level preferences
interaction test.
