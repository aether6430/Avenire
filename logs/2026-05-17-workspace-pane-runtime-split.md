# Workspace Pane Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the shared navigation/interaction runtime layer out of
`apps/web/src/lib/workspace-panes.tsx` into:

- `apps/web/src/lib/workspace-pane-runtime.ts`
- `apps/web/src/lib/workspace-pane-runtime.test.ts`

Moved:

- pane navigation orchestration
- pane router creation
- surface navigation orchestration
- navigable anchor filtering for pane interactions

The original `workspace-panes.tsx` now focuses more tightly on React provider,
hooks, and interaction boundary composition.

## Why it mattered

This is central shared navigation infrastructure. Pulling the non-React runtime
logic outward makes pane behavior easier to test, reason about, and evolve
without pushing more imperative code back into the provider/hook shell.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/workspace-panes.tsx apps/web/src/lib/workspace-pane-model.ts apps/web/src/lib/workspace-pane-model.test.ts apps/web/src/lib/workspace-pane-runtime.ts apps/web/src/lib/workspace-pane-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`workspace-panes.tsx` is now cleaner, but the remaining React/provider shell
still deserves eventual coverage around hook behavior at a higher integration
level.
