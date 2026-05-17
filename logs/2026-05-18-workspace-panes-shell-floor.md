# Workspace Panes Shell Floor

Tags: tests, structure, navigation, reliability

## What changed

Added direct tests for the top-level pane shell:

- `apps/web/src/lib/workspace-panes.test.tsx`

Covered behavior:

- required-provider enforcement for `useCurrentWorkspacePane()`
- provider value exposure through:
  - `useCurrentWorkspacePaneCompact()`
  - `usePanePathname()`
  - `usePaneSearchParams()`
  - `useOptionalCurrentWorkspacePane()`
- pane-router construction through `usePaneRouter()`
- workspace navigation helper construction through:
  - `useWorkspacePaneNavigation()`
  - `useWorkspaceSurfaceNavigation()`

## Why it mattered

The pane model, runtime, and store had all been strengthened in earlier passes,
but `workspace-panes.tsx` itself was still largely an untested shell. This pass
puts a direct floor under the provider/hook layer that ties those lower pieces
together.

That makes the pane system feel less like “well-tested internals plus an
assumed wrapper” and more like a coherent navigation surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/workspace-panes.test.tsx`
- `node_modules/.bin/vitest run src/lib/workspace-panes.test.tsx src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts src/stores/workspace-pane-store-model.test.ts src/stores/workspacePaneStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The provider/hook shell now has a direct floor, but the interaction boundary
event handlers are still only indirectly validated. If the pane system keeps
causing UX regressions, the next follow-up here would be browser-level
interaction verification rather than more server-render-only tests.
