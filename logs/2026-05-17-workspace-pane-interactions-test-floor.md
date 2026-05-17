# Workspace Pane Interactions Test Floor

Tags: tests, reliability, navigation, verification

## What changed

Added direct tests for `use-workspace-pane-interactions.tsx`, the shared hook
that routes pane drag/drop intent into store actions.

New test file:

- `apps/web/src/components/dashboard/use-workspace-pane-interactions.test.tsx`

Covered behavior:

- dropped workspace links route `top` previews into vertical `openPane`
  requests with `before` placement
- dragged panes route `bottom` previews into vertical `movePaneToSplit`
  requests with `after` placement

## Why it mattered

After the pane-system behavior work, the interaction hook was still the least
verified piece in the stack despite being the bridge from drag gestures to
actual pane mutations.

This pass gives that bridge a direct test floor so the pane system is less
dependent on indirect confidence from neighboring model tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/use-workspace-pane-interactions.test.tsx`
- `node_modules/.bin/vitest run src/components/dashboard/use-workspace-pane-interactions.test.tsx src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts src/components/dashboard/workspace-pane-renderer-model.test.ts src/components/dashboard/workspace-pane-renderer.test.tsx src/stores/workspace-pane-store-model.test.ts src/stores/workspacePaneStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The pane interaction stack now has a stronger local floor. The next likely pane
follow-up would be visual/manual verification of drag thresholds and row-split
feel in a running browser, rather than more unit-only coverage.
