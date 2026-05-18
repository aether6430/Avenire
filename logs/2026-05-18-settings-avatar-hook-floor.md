# Settings Avatar Hook Floor

Tags: tests, settings, account, avatar

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-avatar.test.tsx`

New directly covered behavior:

- ignoring empty file selections
- upload transport through `useUploadThing`
- profile persistence after a successful upload
- missing-upload-url handling
- upload error surfacing through the shared upload-error mapper

## Why it mattered

After extracting the deterministic avatar runtime model, this adds a direct
floor on the actual hook workflow that drives avatar upload behavior in the
account surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-avatar.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-avatar.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a hook floor rather than a browser-level upload interaction test.
