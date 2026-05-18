# Settings Shell And Dialogs Floor

Tags: tests, ux, settings, navigation, security

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-panel-shell.test.tsx`
- `apps/web/src/components/settings/settings-panel-dialogs.test.tsx`

New directly covered behavior:

- desktop and mobile settings-shell navigation rendering
- current-plan badge and account identity rendering in the mobile shell
- keyboard-shortcuts tab gating on keyboard detection
- sudo verification dialog copy and email rendering
- disabled verify state before a full code is present
- sending/verifying/status render states for the sudo dialog

## Why it mattered

The shell and verification dialog are cross-cutting settings surfaces. Even if
the inner sections are correct, these top-level wrappers shape how the product
actually feels when people navigate settings or confirm sensitive actions.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-panel-shell.test.tsx apps/web/src/components/settings/settings-panel-dialogs.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-panel-shell.test.tsx src/components/settings/settings-panel-dialogs.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These tests cover render-level trust in the shell and dialog, but not the
effect-driven settings hooks that trigger their behavior.
