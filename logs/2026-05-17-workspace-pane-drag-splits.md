# Workspace Pane Drag Splits

Tags: ux, navigation, tests, verification

## What changed

Completed the next pane-system follow-up after real vertical splits landed:
drag-and-drop previews and split intent now understand top/bottom regions too.

Changed areas:

- `workspace-pane-renderer-model.ts`
- `workspace-pane-renderer-model.test.ts`
- `use-workspace-pane-interactions.ts`
- `workspace-pane-layout.tsx`
- `workspace-pane-surface.tsx`
- `workspace-pane-store-model.ts`
- `workspace-pane-store-model.test.ts`

Concrete behavior changes:

- pane drop regions now support `top` and `bottom` in addition to
  `left/right/center`
- drag-and-drop previews can insert a dedicated preview row for vertical splits
- dragged panes moved into vertical splits now create and size a real row using
  target-row height, instead of treating the new row like an unrelated 100%
  block
- split direction/placement is now derived from the actual preview region

## Why it mattered

After the previous pass, explicit menu-driven vertical splits were real, but
drag gestures still acted as if the pane system were horizontal-only. That left
the UX partially dishonest.

This pass makes the interaction model match the actual layout model more
closely, which matters for product trust in a central workspace surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/workspace-pane-renderer-model.ts apps/web/src/components/dashboard/workspace-pane-renderer-model.test.ts apps/web/src/components/dashboard/use-workspace-pane-interactions.ts apps/web/src/components/dashboard/workspace-pane-layout.tsx apps/web/src/components/dashboard/workspace-pane-surface.tsx apps/web/src/stores/workspace-pane-store-model.ts apps/web/src/stores/workspace-pane-store-model.test.ts`
- `node_modules/.bin/vitest run src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts src/components/dashboard/workspace-pane-renderer-model.test.ts src/components/dashboard/workspace-pane-renderer.test.tsx src/stores/workspace-pane-store-model.test.ts src/stores/workspacePaneStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

Drop-region heuristics are now honest enough for vertical splits, but they are
still geometry-threshold based. A later polish pass could tune those thresholds
or add more deliberate affordances if pane drag UX becomes a core workflow.
