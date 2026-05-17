# File Preview Cache Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the runtime/orchestration layer out of `apps/web/src/lib/file-preview-cache.ts`
into:

- `apps/web/src/lib/file-preview-cache-runtime.ts`
- `apps/web/src/lib/file-preview-cache-runtime.test.ts`

`file-preview-cache.ts` now acts as a thin public surface that re-exports:

- pure/model helpers from `file-preview-cache-model.ts`
- runtime warmup/cache behavior from `file-preview-cache-runtime.ts`

Moved runtime behavior:

- opened-file tracking
- warm cache entry lifecycle
- preconnect link insertion
- progressive media warming
- HLS manifest/media warmup
- preview blob priming
- cached playback source resolution

## Why it mattered

This completes the structural split for a UX-critical preview cache path. The
pure parsing/cache-key layer and the DOM/network warmup layer are now separate,
which makes the system easier to reason about and safer to evolve.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/file-preview-cache.ts apps/web/src/lib/file-preview-cache-model.ts apps/web/src/lib/file-preview-cache-model.test.ts apps/web/src/lib/file-preview-cache-runtime.ts apps/web/src/lib/file-preview-cache-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/file-preview-cache-model.test.ts src/lib/file-preview-cache-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The file preview cache area is now structurally cleaner. The next follow-up here
would be broader integration coverage for the chat/files surfaces that consume
the cache, rather than more surgery inside the cache modules.
