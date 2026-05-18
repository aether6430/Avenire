# Settings Shortcuts Hook Floor

Tags: tests, settings, shortcuts

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-shortcuts.test.tsx`

New directly covered behavior:

- empty-query boot state using the full shortcut catalog
- initial filtered shortcut count derivation

## Why it mattered

This is a small composition floor for the shortcuts surface. It is not the
highest-risk part of the product, but it rounds out the settings contour with a
cheap, stable check instead of leaving the hook completely implicit.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-shortcuts.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-shortcuts.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is only a minimal floor; richer interaction around search updates still
would require a more involved test harness.
