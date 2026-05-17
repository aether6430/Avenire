# File Preview Panel Coordinator Split

Tags: structure, files, verification

## What changed

Split the file preview panel runtime into explicit local owners for media view
selection, retrieval highlight derivation, note loading/sync workflows, the pane
header, and the properties dialog.

The panel now coordinates those owners instead of carrying PDF/video/audio/image
rendering, markdown note persistence, retrieval mapping, and header menu logic in
one component. It also resets preview-local state when the active file changes so
failed media loads, Circle to AI state, PDF inversion, and the properties dialog
do not leak between files.

## Why it mattered

The file preview panel is a high-traffic product surface. Keeping media, note,
header, and retrieval rules in one module made the preview path harder to reason
about and riskier to change. This pass moves the pure policy and side-effect
clusters behind local boundaries while preserving the existing user-facing
preview behavior.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/files/explorer/file-preview-panel.tsx apps/web/src/components/files/explorer/shared.ts apps/web/src/components/files/explorer/file-preview-media-model.ts apps/web/src/components/files/explorer/file-preview-media-model.test.ts apps/web/src/components/files/explorer/file-preview-media-pane.tsx apps/web/src/components/files/explorer/file-preview-note-client.ts apps/web/src/components/files/explorer/file-preview-note-client.test.ts apps/web/src/components/files/explorer/file-preview-note-shared.ts apps/web/src/components/files/explorer/file-preview-pane-header-model.ts apps/web/src/components/files/explorer/file-preview-pane-header-model.test.ts apps/web/src/components/files/explorer/file-preview-properties-dialog.tsx apps/web/src/components/files/explorer/file-preview-retrieval-model.ts apps/web/src/components/files/explorer/file-preview-retrieval-model.test.ts apps/web/src/components/files/explorer/use-file-preview-note-bootstrap.ts apps/web/src/components/files/explorer/use-file-preview-note-cover.ts apps/web/src/components/files/explorer/use-file-preview-note-persistence.ts apps/web/src/components/files/explorer/use-file-preview-note-workflows.ts apps/web/src/components/files/explorer/use-file-preview-pane-header.tsx` passed.
- `node_modules/.bin/vitest run src/components/files/explorer/file-preview-media-model.test.ts src/components/files/explorer/file-preview-retrieval-model.test.ts src/components/files/explorer/file-preview-note-client.test.ts src/components/files/explorer/file-preview-pane-header-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose` passed.

## Remaining concerns

`pnpm --filter @avenire/web check-types --pretty false` again stalled silently
in this iCloud-managed Desktop checkout with the `pnpm` process at 0% CPU and
was killed after inspection. That is an environment integrity limitation already
being tracked separately, so this pass is verified with focused lint and focused
tests rather than a full web typecheck.
