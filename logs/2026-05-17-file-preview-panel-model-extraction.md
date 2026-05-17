# File Preview Panel Model Extraction

Tags: structure, verification, tests

## What changed

- Extracted the pure derived-state layer out of
  `file-preview-panel.tsx` into:
  - `file-preview-panel-model.ts`
  - `file-preview-panel-model.test.ts`
- Moved ownership for:
  - page-icon normalization
  - markdown link-source resolution
  - active file/media source derivation
  - video captions route derivation
  - retrieval-model assembly
  - preview-kind and playback-descriptor derivation

## Why it mattered

`file-preview-panel.tsx` sits directly on the signed-in files flow and was
carrying a dense mix of note/media UI wiring and pure preview derivations.
This pass reduced the file and made the most important preview-state decisions
directly testable without forcing a large UI split.

## Verification

- line counts:
  - `file-preview-panel.tsx`: `466` -> `408`
  - `file-preview-panel-model.ts`: `94`
  - `file-preview-panel-model.test.ts`: `94`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/file-preview-panel.tsx apps/web/src/components/files/explorer/file-preview-panel-model.ts apps/web/src/components/files/explorer/file-preview-panel-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/file-preview-panel-model.test.ts src/components/files/explorer/file-preview-pane-header-model.test.ts src/components/files/explorer/explorer-retrieval-props.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3052 BETTER_AUTH_URL=http://127.0.0.1:3052 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The panel is smaller and less tangled now, but the broader files/explorer
  cluster still carries larger runtime-heavy surfaces such as
  `use-circle-to-ai-search-overlay.ts`, `explorer-upload-batch.ts`, and the
  remaining preview/media panes.
