# Settings Sudo Runtime Model

Tags: tests, structure, settings, security, sudo

## What changed

Extracted deterministic sudo helpers from:

- `apps/web/src/components/settings/use-settings-panel-sudo.ts`

into:

- `apps/web/src/components/settings/settings-sudo-runtime-model.ts`
- `apps/web/src/components/settings/settings-sudo-runtime-model.test.ts`

New directly covered behavior:

- initial sudo refresh gating
- auto-request gating for verification codes
- request-sudo action state
- request-code start/success/failure states
- verify-code start/success/failure states
- resolved active/inactive sudo status payloads

## Why it mattered

This is a sensitive trust surface in settings. Moving the deterministic state
logic out of the hook makes the behavior easier to verify and less likely to
quietly drift.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-sudo-runtime-model.ts apps/web/src/components/settings/settings-sudo-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-sudo.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-sudo-runtime-model.test.ts src/components/settings/settings-panel-dialogs.test.tsx src/components/settings/settings-security-tab-shell.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The sudo hook now carries less hidden deterministic logic, but the full
browser-level flow is still a richer future follow-up than these unit floors.
