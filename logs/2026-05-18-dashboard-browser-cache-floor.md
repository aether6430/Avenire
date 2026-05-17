# Dashboard Browser Cache Floor

Tags: tests, reliability, cache, dashboard

## What changed

Added direct coverage for the shared browser-cache slice:

- `apps/web/src/lib/browser-cache-read.test.ts`
- `apps/web/src/lib/browser-cache-write.test.ts`
- `apps/web/src/lib/dashboard-browser-cache.test.ts`

New directly covered behavior:

- fail-closed browser cache reads when `window` is unavailable
- fail-closed reads for malformed JSON and validator mismatches
- successful browser cache serialization
- swallowed local-storage write failures
- namespaced dashboard cache reads/writes for chats, flashcard sets, tasks, and
  workspace summaries
- workspace cache isolation across different workspace ids
- fail-closed reads for malformed cached dashboard payloads

## Why it mattered

This cache layer sits under several user-facing surfaces at once: dashboard chat
sidebar hydration, task caching, flashcard summary caching, and workspace list
warmup. Before this pass, that shared slice had almost no direct floor, so a
bad cache payload could silently distort multiple parts of the product.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/browser-cache-read.test.ts apps/web/src/lib/browser-cache-write.test.ts apps/web/src/lib/dashboard-browser-cache.test.ts`
- `node_modules/.bin/vitest run src/lib/browser-cache-read.test.ts src/lib/browser-cache-write.test.ts src/lib/dashboard-browser-cache.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The cache helpers now have a direct floor, but this does not yet prove every
live hook that consumes them. The next strong follow-up remains the highest-risk
consumer surfaces that still mostly coordinate effects around those cached
payloads.
