# File Preview Panel Hook Surface Split

Tags: structure, verification

## What changed

- Reduced `file-preview-panel.tsx` to a thin wrapper.
- Split the old panel owner into local files:
  - `file-preview-panel.tsx`
  - `file-preview-panel-types.ts`
  - `use-file-preview-panel.ts`
  - `file-preview-panel-surface.tsx`
- Reused the already-extracted `file-preview-panel-model.ts` for the pure
  derived preview state.
- Added a wrapper-level test to prove the wrapper passes props into the local
  hook and surface.

## Why it mattered

The previous model extraction made the pure preview derivations testable, but
`file-preview-panel.tsx` still carried the remaining note/media/pane orchestration
 in one component. This pass moved that orchestration into a local hook and
 left the root file as a small coordinator, which matches the repo’s newer
 pattern for complex app-facing surfaces.

## Verification

- line counts:
  - `file-preview-panel.tsx`: `408` -> `13`
  - `use-file-preview-panel.ts`: `314`
  - `file-preview-panel-surface.tsx`: `107`
  - `file-preview-panel-types.ts`: `50`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/file-preview-panel.tsx apps/web/src/components/files/explorer/file-preview-panel-types.ts apps/web/src/components/files/explorer/use-file-preview-panel.ts apps/web/src/components/files/explorer/file-preview-panel-surface.tsx apps/web/src/components/files/explorer/file-preview-panel.test.tsx apps/web/src/components/files/explorer/file-preview-panel-model.ts apps/web/src/components/files/explorer/file-preview-panel-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/file-preview-panel.test.tsx src/components/files/explorer/file-preview-panel-model.test.ts src/components/files/explorer/file-preview-pane-header-model.test.ts src/components/files/explorer/explorer-retrieval-props.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3057 BETTER_AUTH_URL=http://127.0.0.1:3057 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now honest, but the underlying files runtime cluster still
  has other larger surfaces and hooks, especially the remaining circle-to-AI
  and explorer/media paths.
