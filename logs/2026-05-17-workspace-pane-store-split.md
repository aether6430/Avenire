# Workspace Pane Store Split

Tags: structure, tests, reliability, navigation

## What changed

Split `apps/web/src/stores/workspacePaneStore.ts` into a thinner Zustand shell and
a dedicated pure model layer:

- `apps/web/src/stores/workspace-pane-store-model.ts`
- `apps/web/src/stores/workspace-pane-store-model.test.ts`
- `apps/web/src/stores/workspacePaneStore.test.ts`

Moved into the model layer:

- pane/row size normalization
- row cleanup and pane-layout sanitization
- initial pane creation
- open / close / reorder / move transitions
- route syncing and pane-size updates

The store shell now focuses on:

- ID generation
- Zustand action wiring
- persisted-state partialization and merge

## Why it mattered

This is shared navigation infrastructure that sits under dashboard and file-pane
flows. Before this pass it was a 482-line mixed store with no direct tests.
After the split the actual state machine is testable, the shell is much smaller,
and the active-pane-close path is safer and easier to reason about.

## Verification

- `node_modules/.bin/biome check apps/web/src/stores/workspacePaneStore.ts apps/web/src/stores/workspacePaneStore.test.ts apps/web/src/stores/workspace-pane-store-model.ts apps/web/src/stores/workspace-pane-store-model.test.ts`
- `node_modules/.bin/vitest run src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts src/stores/workspace-pane-store-model.test.ts src/stores/workspacePaneStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The store is structurally healthier now, but vertical split intent still does
not materialize into a multi-row layout. That is a real follow-up for product
coherence in the pane system, not just a code-style concern.
