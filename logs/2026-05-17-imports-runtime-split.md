# Imports Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the remaining import execution pipelines out of
`apps/web/src/lib/imports.ts` into:

- `apps/web/src/lib/imports-notion-runtime.ts`
- `apps/web/src/lib/imports-notion-runtime.test.ts`
- `apps/web/src/lib/imports-google-drive-runtime.ts`
- `apps/web/src/lib/imports-google-drive-runtime.test.ts`

`imports.ts` now acts as a thin server-only export surface that re-exports:

- provider/destination runtime
- Notion import runtime
- Google Drive import runtime
- shared import constants

## Why it mattered

This removes the last large execution branches from `imports.ts`. The import
surface is now much easier to navigate, while provider setup, Notion page
imports, and Google Drive file imports are independently testable modules.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/imports.ts apps/web/src/lib/imports-provider-runtime.ts apps/web/src/lib/imports-provider-runtime.test.ts apps/web/src/lib/imports-notion-runtime.ts apps/web/src/lib/imports-notion-runtime.test.ts apps/web/src/lib/imports-google-drive-runtime.ts apps/web/src/lib/imports-google-drive-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/imports-provider-runtime.test.ts src/lib/imports-notion-runtime.test.ts src/lib/imports-google-drive-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The imports area is now significantly cleaner, but any future growth in shared
buffer upload helpers or cross-provider metadata shaping should stay local to
the import runtime modules instead of flowing back into the shell file.
