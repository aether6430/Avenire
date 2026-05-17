# File Preview Pane Header Content Split

Tags: structure, verification

## What changed

- Reduced `use-file-preview-pane-header.tsx` to the hook that coordinates
  `setHeaderContext`.
- Split the large inline header UI into local owners:
  - `file-preview-pane-header-content.tsx`
  - `use-file-preview-pane-header.tsx`
- Added a focused content test covering:
  - leading icon rendering
  - markdown breadcrumb title rendering
  - extracted actions menu label rendering

## Why it mattered

The old hook mixed:

- Circle to AI param bootstrapping
- header-context orchestration
- leading icon rendering
- breadcrumb rendering
- a large file actions dropdown surface

This pass keeps the hook as the owner of header-context wiring while moving the
actual header content into explicit local UI owners that are easier to change
correctly.

## Verification

- line counts:
  - `use-file-preview-pane-header.tsx`: `423` -> `199`
  - `file-preview-pane-header-content.tsx`: `367`
  - `file-preview-pane-header-content.test.tsx`: `95`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/use-file-preview-pane-header.tsx apps/web/src/components/files/explorer/file-preview-pane-header-content.tsx apps/web/src/components/files/explorer/file-preview-pane-header-content.test.tsx apps/web/src/components/files/explorer/file-preview-pane-header-model.ts apps/web/src/components/files/explorer/file-preview-pane-header-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/file-preview-pane-header-content.test.tsx src/components/files/explorer/file-preview-pane-header-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3069 BETTER_AUTH_URL=http://127.0.0.1:3069 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- `use-file-preview-pane-header.tsx` is now much smaller and clearer, but the
  extracted header content file remains a meaningful local UI owner in the
  preview-pane cluster.
