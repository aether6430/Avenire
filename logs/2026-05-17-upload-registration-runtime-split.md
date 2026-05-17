# Upload Registration Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the orchestration/runtime layer out of
`apps/web/src/lib/upload-registration.ts` into:

- `apps/web/src/lib/upload-registration-runtime.ts`
- `apps/web/src/lib/upload-registration-runtime.test.ts`

`upload-registration.ts` now acts as a public surface that re-exports:

- pure/model helpers from `upload-registration-model.ts`
- runtime registration helpers from `upload-registration-runtime.ts`

Moved runtime behavior:

- dedupe checks for markdown and binary uploads
- note creation and markdown registration flow
- upload usage metering rollback
- UploadThing cleanup
- workspace invalidation + ingestion event publishing

## Why it mattered

This completes the structural split for a critical upload/import path. The
public entry file is much smaller, while the runtime flow is independently
testable instead of being buried inside a single mixed module.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/upload-registration.ts apps/web/src/lib/upload-registration-model.ts apps/web/src/lib/upload-registration-model.test.ts apps/web/src/lib/upload-registration-runtime.ts apps/web/src/lib/upload-registration-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/upload-registration-model.test.ts src/lib/upload-registration-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The upload-registration area is now much cleaner. The next worthwhile follow-up
would be higher-level integration coverage around the routes that consume these
helpers, rather than adding more structure inside the registration modules.
