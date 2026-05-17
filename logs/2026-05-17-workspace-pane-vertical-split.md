# Workspace Pane Vertical Split

Tags: ux, structure, tests, navigation

## What changed

Completed the missing behavior behind workspace pane split direction.

The pane system now materializes vertical splits as real stacked rows instead of
silently collapsing everything back into a single horizontal row.

Changed areas:

- `workspace-pane-store-model.ts`
- `workspacePaneStore.ts`
- `workspace-pane-renderer-model.ts`
- `use-workspace-pane-interactions.ts`
- `use-workspace-pane-renderer.ts`
- `workspace-pane-layout.tsx`
- `workspace-pane-surface.tsx`

Concrete behavior changes:

- vertical `openPane(..., { splitDirection: "vertical" })` now creates a new
  full-width row with normalized row heights
- the desktop pane layout now renders multiple rows and supports row resizing
- the pane action menu now exposes both `Split right` and `Split down`
- row-aware rendering preserves per-row pane widths instead of flattening all
  panes into one strip

## Why it mattered

This was a product-coherence bug, not just a code-style problem. The pane APIs
already suggested vertical split support, but the actual experience could not
honor that intent because state sanitization collapsed rows away and the desktop
renderer only knew how to draw one row.

Finishing this path makes the workspace pane system feel more intentional and
less fake-internal.

## Verification

- `node_modules/.bin/biome check apps/web/src/stores/workspace-pane-store-model.ts apps/web/src/stores/workspace-pane-store-model.test.ts apps/web/src/stores/workspacePaneStore.ts apps/web/src/stores/workspacePaneStore.test.ts apps/web/src/components/dashboard/workspace-pane-renderer-model.ts apps/web/src/components/dashboard/workspace-pane-renderer-model.test.ts apps/web/src/components/dashboard/use-workspace-pane-interactions.ts apps/web/src/components/dashboard/use-workspace-pane-renderer.ts apps/web/src/components/dashboard/workspace-pane-layout.tsx apps/web/src/components/dashboard/workspace-pane-renderer.tsx apps/web/src/components/dashboard/workspace-pane-surface.tsx`
- `node_modules/.bin/vitest run src/lib/workspace-pane-model.test.ts src/lib/workspace-pane-runtime.test.ts src/components/dashboard/workspace-pane-renderer-model.test.ts src/components/dashboard/workspace-pane-renderer.test.tsx src/stores/workspace-pane-store-model.test.ts src/stores/workspacePaneStore.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

Drag-and-drop preview logic still only models left/right insertion regions. The
pane system now supports real stacked rows, but drag gestures still bias toward
horizontal splits. That is the next natural UX follow-up if we keep investing
in the workspace pane system.
