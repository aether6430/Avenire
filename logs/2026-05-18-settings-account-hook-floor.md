# Settings Account Hook Floor

Tags: tests, settings, account, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-profile.test.tsx`
- `apps/web/src/components/settings/use-settings-panel-linked-accounts.test.tsx`

New directly covered behavior:

- initial profile draft hydration from the session user
- profile save payload trimming and success/failure return values
- linked-account refresh transport
- provider connect/unlink action transport

## Why it mattered

After extracting deterministic account models, these direct hook floors make the
account settings surface less dependent on trust in untested glue code.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-profile.test.tsx apps/web/src/components/settings/use-settings-panel-linked-accounts.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-profile.test.tsx src/components/settings/use-settings-panel-linked-accounts.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are direct hook floors, but they still are not a browser-interaction floor
for the full account settings workflow.
