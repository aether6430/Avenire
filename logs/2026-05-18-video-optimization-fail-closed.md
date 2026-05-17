# Video Optimization Fail-Closed Fix

Tags: reliability, tests, media, verification

## What changed

Fixed a fail-closed bug in:

- `apps/web/src/lib/video-optimization-runtime.ts`

Changes:

- normalized `UPLOADTHING_TOKEN` so missing/placeholder values like
  `"undefined"` and `"null"` are treated as absent
- made DNS validation fail closed when hostname lookup does not return a usable
  address list

## Why it mattered

This bug was surfaced by a fresh coverage sweep. The video optimization path
was attempting to continue into source validation when the upload token was
effectively missing, which is exactly the kind of hidden runtime fragility the
recovery objective is trying to remove.

## Verification

- `node_modules/.bin/vitest run src/lib/video-optimization-runtime.test.ts src/lib/video-optimization-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/biome check apps/web/src/lib/video-optimization-runtime.ts`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The media optimization path now fails closed more reliably when configuration or
DNS validation is broken. The remaining work in this area is more structural
than correctness-focused.
