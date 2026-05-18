# Settings Tab Shells Floor

Tags: tests, ux, settings, composition

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/settings-security-tab-shell.test.tsx`
- `apps/web/src/components/settings/settings-workspace-tab-shell.test.tsx`
- `apps/web/src/components/settings/settings-shortcuts-tab-shell.test.tsx`

New directly covered behavior:

- security tab shell wiring passkeys and account-danger runtime into the visible section
- workspace tab shell passing composed runtime and keeping dialogs closed by default
- shortcuts tab shell routing shared shortcut runtime into the visible section

## Why it mattered

These tab shells are the glue between settings hooks and the visible sections.
They are easy to overlook, but they materially affect whether the product feels
coherent or brittle when users switch between settings areas.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-security-tab-shell.test.tsx apps/web/src/components/settings/settings-workspace-tab-shell.test.tsx apps/web/src/components/settings/settings-shortcuts-tab-shell.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-security-tab-shell.test.tsx src/components/settings/settings-workspace-tab-shell.test.tsx src/components/settings/settings-shortcuts-tab-shell.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are still render/composition floors; the deeper effect-driven hooks behind
the shells remain stronger future follow-up territory.
