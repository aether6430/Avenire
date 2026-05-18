# Settings Top-Level Shells Floor

Tags: tests, settings, dialogs, composition

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-dialog.test.tsx`
- `apps/web/src/components/settings/settings-panel.test.tsx`

New directly covered behavior:

- settings dialog shell rendering
- forwarding initial tab/workspace props into the panel
- composing content and dialogs from the shared settings panel runtime

## Why it mattered

These top-level shells are the entrypoint to the whole settings experience.
Giving them a direct floor reduces trust in invisible wiring and complements the
many lower-level settings passes already completed.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-dialog.test.tsx apps/web/src/components/settings/settings-panel.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-dialog.test.tsx src/components/settings/settings-panel.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are still composition/render floors rather than browser-level settings
interaction tests.
