# Imports Provider Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split provider/destination runtime out of `apps/web/src/lib/imports.ts` into:

- `apps/web/src/lib/imports-provider-runtime.ts`
- `apps/web/src/lib/imports-provider-runtime.test.ts`

Moved:

- provider scope parsing and matching
- token usability checks
- provider readiness/status computation
- provider access-token resolution
- import destination overview/debug snapshot
- destination folder listing
- destination save flow
- required destination resolution

## Why it mattered

`imports.ts` was carrying setup/state logic for auth providers and import
destinations alongside actual Notion/Google import pipelines. This split makes
the provider/destination behavior independently testable and leaves the main
imports file more focused on actual import execution.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/imports.ts apps/web/src/lib/imports-provider-runtime.ts apps/web/src/lib/imports-provider-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/imports-provider-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/imports.ts` still owns the Notion and Google import pipelines
themselves. Those are the next natural extraction targets inside this flow.
