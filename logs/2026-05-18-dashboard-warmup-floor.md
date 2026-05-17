# Dashboard Warmup Floor

Tags: tests, reliability, cache, navigation

## What changed

Expanded direct coverage for:

- `apps/web/src/lib/dashboard-warmup.test.ts`

New directly covered behavior:

- background warmup for workspaces, chats, and flashcard sets
- fail-open flashcard response fallback to an empty cached list
- in-flight deduplication for repeated chat-surface warmups
- files-surface warmup only preloading the workspace list
- skipping background warmup on data-saver connections

## Why it mattered

`dashboard-warmup.ts` drives background cache hydration for several dashboard
surfaces. Before this pass, it only had a tiny route-prefetch smoke test. That
left most of the real preload behavior unproven, including deduplication and
connection-based gating.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/dashboard-warmup.test.ts`
- `node_modules/.bin/vitest run src/lib/dashboard-warmup.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The warmup layer itself now has a direct floor, but it still depends on the
live consumers that read those caches and render the warmed surfaces. The next
follow-up in this area would be additional floors on the most effect-heavy
consumers that depend on warmed cache state.
