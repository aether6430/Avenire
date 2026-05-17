# Video Delivery Optimization Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the runtime/orchestration layer out of
`apps/web/src/lib/video-delivery-optimization.ts` into:

- `apps/web/src/lib/video-delivery-optimization-runtime.ts`
- `apps/web/src/lib/video-delivery-optimization-runtime.test.ts`

`video-delivery-optimization.ts` now acts as a thin server-only export surface
for the runtime behavior.

Moved:

- Mux asset polling
- legacy optimization execution
- Mux delivery execution
- async scheduling/fallback logic

## Why it mattered

This completes the structural split for the video delivery optimization path:
pure delivery-state logic already lived in `video-delivery-core.ts`, and now the
runtime orchestration also lives in its own focused module instead of sharing a
god file with the public surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/video-delivery-optimization.ts apps/web/src/lib/video-delivery-optimization-runtime.ts apps/web/src/lib/video-delivery-optimization-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/video-delivery-optimization-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The video delivery path is structurally much cleaner now. The next meaningful
follow-up here would be integration-style coverage around route-level callers or
live-provider failure handling, rather than more module surgery inside this
area.
