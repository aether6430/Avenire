# Settings Security Hook Floor

Tags: tests, settings, security, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-passkeys.test.tsx`
- `apps/web/src/components/settings/use-settings-panel-account-danger.test.tsx`

New directly covered behavior:

- passkey refresh transport
- add/remove passkey transport
- account-delete sudo gating
- account-delete success redirect
- 403 re-verification path

## Why it mattered

After extracting the deterministic security model, this gives the remaining hook
glue a direct floor too, so the security contour is less dependent on implicit
trust across multiple small pieces.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-passkeys.test.tsx apps/web/src/components/settings/use-settings-panel-account-danger.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-passkeys.test.tsx src/components/settings/use-settings-panel-account-danger.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are still hook floors rather than browser-level interaction tests.
