# Video Optimization Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the runtime/orchestration layer out of `apps/web/src/lib/video-optimization.ts`
into:

- `apps/web/src/lib/video-optimization-runtime.ts`
- `apps/web/src/lib/video-optimization-runtime.test.ts`

`video-optimization.ts` now acts as a thin public surface that re-exports:

- runtime behavior from `video-optimization-runtime.ts`
- shared types for optimized upload outputs

Moved runtime behavior:

- source URL validation
- ffmpeg/ffprobe command execution
- source download flow
- media upload batching
- poster generation
- HLS asset generation
- top-level optimize-and-reupload orchestration

## Why it mattered

This completes the structural split for the media optimization path: pure
decisioning and naming logic live in the model module, while the ffmpeg/network
runtime lives in a focused runtime module. The public entry file is now far less
fragile to future edits.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/video-optimization.ts apps/web/src/lib/video-optimization-runtime.ts apps/web/src/lib/video-optimization-runtime.test.ts apps/web/src/lib/video-optimization-model.ts apps/web/src/lib/video-optimization-model.test.ts`
- `node_modules/.bin/vitest run src/lib/video-optimization-model.test.ts src/lib/video-optimization-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The video optimization area is now structurally cleaner. The next valuable step
here would be higher-level integration coverage around `video-delivery-optimization.ts`
or broader behavior under real ffmpeg failure scenarios.
