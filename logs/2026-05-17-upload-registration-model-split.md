# Upload Registration Model Split

Tags: structure, tests, reliability, verification

## What changed

Split the pure upload-registration model helpers out of
`apps/web/src/lib/upload-registration.ts` into:

- `apps/web/src/lib/upload-registration-model.ts`
- `apps/web/src/lib/upload-registration-model.test.ts`

Moved:

- sha256 normalization
- mime-type inference and resolution
- markdown-upload detection
- UploadThing storage URL normalization
- frontmatter-to-page-metadata extraction for markdown note uploads

## Why it mattered

`upload-registration.ts` sits on a critical upload/import path but had no local
test floor. Pulling the pure helper/model logic outward makes the path more
codable and gives the upload registration flow its first focused unit tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/upload-registration.ts apps/web/src/lib/upload-registration-model.ts apps/web/src/lib/upload-registration-model.test.ts`
- `node_modules/.bin/vitest run src/lib/upload-registration-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/upload-registration.ts` still owns dedupe behavior, billing
metering, file registration, and ingestion-event publishing. Those runtime
branches remain good future extraction targets.
