# Settings Sudo Hook Floor

Tags: tests, settings, security, hooks

## What changed

Added direct coverage for:

- `apps/web/src/components/settings/use-settings-panel-sudo.test.tsx`

New directly covered behavior:

- sudo status refresh transport
- request-code transport
- verify-code transport
- opening a pending sudo action through `verifySudoSession()`

## Why it mattered

After extracting the sudo runtime model, this gives the hook itself a direct
transport-level floor so the security contour is less dependent on trust in the
remaining glue code.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/use-settings-panel-sudo.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/use-settings-panel-sudo.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a transport/glue floor rather than a full browser-level sudo
verification interaction test.
