# Settings Billing Runtime Model

Tags: tests, structure, billing, settings

## What changed

Extracted deterministic billing runtime helpers from:

- `apps/web/src/components/settings/use-settings-panel-billing.ts`

into:

- `apps/web/src/components/settings/settings-billing-runtime-model.ts`
- `apps/web/src/components/settings/settings-billing-runtime-model.test.ts`

New directly covered behavior:

- initial load vs polling gating for the billing tab
- billing load start/success/failure state derivation
- derived billing meter construction from loaded usage
- paid-plan gating
- billing portal error copy resolution

## Why it mattered

This reduces hidden logic inside the billing hook and gives a direct floor to a
paid-user settings surface that matters for trust and account control.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-billing-runtime-model.ts apps/web/src/components/settings/settings-billing-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-billing.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-billing-runtime-model.test.ts src/components/settings/settings-billing-section.test.tsx src/components/settings/settings-billing-client.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The billing hook now carries less hidden deterministic logic, but it still does
not have a full browser-interaction floor for the entire manage-billing flow.
