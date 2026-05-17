# File Preview Cache Model Split

Tags: structure, tests, reliability, verification

## What changed

Split the pure/model helper layer out of `apps/web/src/lib/file-preview-cache.ts`
into:

- `apps/web/src/lib/file-preview-cache-model.ts`
- `apps/web/src/lib/file-preview-cache-model.test.ts`

Moved:

- preview cache key derivation
- preview blob cache eligibility
- shared warm-fetch init construction
- HLS playlist/media URL parsing
- map URI extraction
- warm media URL derivation

## Why it mattered

`file-preview-cache.ts` drives perceived media preview responsiveness across
chat and files surfaces, but previously had no local test floor. Pulling the
pure helper logic outward gives this UX-critical cache path its first focused
tests and leaves the runtime easier to refine safely.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/file-preview-cache.ts apps/web/src/lib/file-preview-cache-model.ts apps/web/src/lib/file-preview-cache-model.test.ts`
- `node_modules/.bin/vitest run src/lib/file-preview-cache-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`file-preview-cache.ts` still owns DOM preconnect behavior, media element warmup,
and HLS/network fetch orchestration. That runtime layer is the next natural
extraction target if this path continues.
