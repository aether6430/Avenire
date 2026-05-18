# Settings Account Runtime Model

Tags: tests, structure, settings, account

## What changed

Extracted deterministic account runtime helpers from:

- `apps/web/src/components/settings/use-settings-panel-linked-accounts.ts`
- `apps/web/src/components/settings/use-settings-panel-profile.ts`

into:

- `apps/web/src/components/settings/settings-account-runtime-model.ts`
- `apps/web/src/components/settings/settings-account-runtime-model.test.ts`

New directly covered behavior:

- initial linked-account loading gating
- linked-account refresh success/failure state derivation
- connect/unlink status messages
- profile draft sync from session state
- profile save start/success/failure status derivation

## Why it mattered

This trims hidden deterministic logic out of the account hooks and gives a
clearer trust floor to the loaded account surface that users actually manage.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-account-runtime-model.ts apps/web/src/components/settings/settings-account-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-linked-accounts.ts apps/web/src/components/settings/use-settings-panel-profile.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-account-runtime-model.test.ts src/components/settings/settings-account-model.test.ts src/components/settings/settings-account-section.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The hooks now carry less deterministic branching internally, but they still do
not have a full interactive browser-level floor.
