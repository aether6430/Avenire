# Settings Account Composition Floor

Tags: tests, structure, settings, account

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-account.test.tsx`

New directly covered behavior:

- composing profile, linked-account, and avatar runtime into one account hook
- correct prop handoff from the account hook into the three local owners

## Why it mattered

After extracting deterministic account/avatar models, this gives the composed
account hook its own direct floor so the account surface is not only tested in
fragments.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-account.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-account.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a composition test, not a full browser-level interaction floor
for the account settings workflow.
