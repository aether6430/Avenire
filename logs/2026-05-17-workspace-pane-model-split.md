# Workspace Pane Model Split

Tags: structure, tests, reliability, verification

## What changed

Split the route/drag/model helper layer out of `apps/web/src/lib/workspace-panes.tsx`
into:

- `apps/web/src/lib/workspace-pane-model.ts`
- `apps/web/src/lib/workspace-pane-model.test.ts`

Moved:

- pane route state types
- pane record/split direction types
- href normalization
- internal workspace href detection
- route state parsing
- workspace-pane drag data set/get/clear helpers

## Why it mattered

`workspace-panes.tsx` is central navigation infrastructure. Pulling the
route/drag model logic outward gives this shared pane path its first focused
tests and reduces the amount of non-React behavior mixed into the hook/provider
surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/workspace-panes.tsx apps/web/src/lib/workspace-pane-model.ts apps/web/src/lib/workspace-pane-model.test.ts`
- `node_modules/.bin/vitest run src/lib/workspace-pane-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`workspace-panes.tsx` still owns the React provider/hooks/navigation runtime and
interaction boundary. Those remain the next natural extraction targets if we
continue on this path.
