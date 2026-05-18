# Settings Workspace Dialogs Floor

Tags: tests, ux, settings, workspace, dialogs

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-workspace-dialogs.test.tsx`

New directly covered behavior:

- new-template dialog state with disabled save and no delete action
- edit-template dialog state with delete action
- banner upload status rendering
- banner preview rendering
- editor shell presence in both states

## Why it mattered

The workspace note-template dialog is a visible editing surface inside settings,
not just an implementation detail. Before this pass it had almost no direct
floor of its own, despite being a core part of workspace customization.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-workspace-dialogs.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-workspace-dialogs.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a render-level floor rather than a browser-interaction test for
the full editor workflow.
