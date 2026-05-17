# Video Optimization Model Split

Tags: structure, tests, reliability, verification

## What changed

Split the pure/model helper layer out of `apps/web/src/lib/video-optimization.ts`
into:

- `apps/web/src/lib/video-optimization-model.ts`
- `apps/web/src/lib/video-optimization-model.test.ts`

Moved:

- private/local address detection
- output naming and asset-stem normalization
- HLS generation decision logic
- scaling math for HLS variants
- HLS variant planning
- playlist reference rewriting

## Why it mattered

`video-optimization.ts` is a high-risk media pipeline with no focused tests.
Moving the pure helper logic outward gives the optimization path its first local
test floor and leaves the remaining runtime/ffmpeg/upload flow easier to
separate in a later pass.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/video-optimization.ts apps/web/src/lib/video-optimization-model.ts apps/web/src/lib/video-optimization-model.test.ts`
- `node_modules/.bin/vitest run src/lib/video-optimization-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/video-optimization.ts` still owns the actual network/ffmpeg
runtime, UploadThing uploads, and HLS asset generation. That remains the next
structural extraction target if we continue on this path.
