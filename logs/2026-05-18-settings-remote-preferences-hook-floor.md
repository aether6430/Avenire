# Settings Remote Preferences Hook Floor

Tags: tests, settings, preferences, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-remote-preferences.test.tsx`

New directly covered behavior:

- loading user settings through the dedicated transport
- persisting user settings through the dedicated transport
- rollback execution on save failure

## Why it mattered

After extracting the deterministic remote-preferences runtime model, this gives
the remaining hook glue a direct floor too, so preferences/billing settings are
less dependent on untested transport behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-remote-preferences.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-remote-preferences.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a hook floor rather than a browser-level preferences interaction
test.
