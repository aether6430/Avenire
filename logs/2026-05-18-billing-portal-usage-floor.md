# Billing Portal And Usage Floor

Tags: tests, reliability, billing, public

## What changed

Added direct coverage for the billing portal and usage slice:

- `apps/web/src/app/api/billing/billing-route-model.test.ts`
- `apps/web/src/app/api/billing/usage/billing-usage-get.test.ts`
- `apps/web/src/app/api/billing/portal/billing-portal-post.test.ts`

New directly covered behavior:

- valid vs invalid billing checkout selection parsing
- billing app base URL resolution
- fail-closed portal return-path sanitization
- unauthorized billing usage requests
- signed-in billing usage responses
- unauthorized and missing-customer portal exits
- successful portal session creation
- fail-closed missing portal URL handling
- fail-closed portal provider failure handling

## Why it mattered

Billing is a trust surface, not an implementation detail. Before this pass, the
portal and usage paths were effectively unproven even though they sit on the
boundary between product value, money, and account state.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/billing/billing-route-model.test.ts apps/web/src/app/api/billing/usage/billing-usage-get.test.ts apps/web/src/app/api/billing/portal/billing-portal-post.test.ts`
- `node_modules/.bin/vitest run src/app/api/billing/billing-route-model.test.ts src/app/api/billing/usage/billing-usage-get.test.ts src/app/api/billing/portal/billing-portal-post.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The server-side billing slice is much stronger now, but the workspace billing
UI that consumes these endpoints remains the next stronger follow-up if we keep
investing in paid-user product coherence.
