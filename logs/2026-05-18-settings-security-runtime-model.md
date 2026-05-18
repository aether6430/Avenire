# Settings Security Runtime Model

Tags: tests, structure, security, settings

## What changed

Extracted deterministic security runtime helpers from:

- `apps/web/src/components/settings/use-settings-panel-passkeys.ts`
- `apps/web/src/components/settings/use-settings-panel-account-danger.ts`

into:

- `apps/web/src/components/settings/settings-security-runtime-model.ts`
- `apps/web/src/components/settings/settings-security-runtime-model.test.ts`

New directly covered behavior:

- passkey payload normalization
- passkey refresh success/failure state derivation
- add/remove passkey status messages
- sudo gating for account deletion
- account-delete outcome resolution for success, error, and sudo-required flows

## Why it mattered

This improves both trust and structure in a sensitive product area. Instead of
leaving these transitions buried in effectful hooks, we now have a direct floor
for the deterministic parts of security behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-security-runtime-model.ts apps/web/src/components/settings/settings-security-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-passkeys.ts apps/web/src/components/settings/use-settings-panel-account-danger.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-security-runtime-model.test.ts src/components/settings/settings-security-section.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The hooks are simpler now, but they still do not have a full browser-level
interaction floor for the complete security workflow.
