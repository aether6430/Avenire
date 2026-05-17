# Explorer Browse Surface Split

Tags: structure, verification

## What changed

- Reduced `explorer-browse-surface.tsx` to a thin coordinator.
- Split the old mixed browse-surface file into local owners:
  - `explorer-browse-surface.tsx`
  - `explorer-browse-surface-types.ts`
  - `explorer-browse-cards.tsx`
  - `explorer-browse-list.tsx`
- Added a focused wrapper test proving the root surface routes shared props into
  the cards and list owners.

## Why it mattered

The old file mixed cards-mode and list-mode rendering in one place even though
those are distinct UI paths with their own row/card owners. This pass makes the
entry file honest and lowers future change-friction in the files browse surface.

## Verification

- line counts:
  - `explorer-browse-surface.tsx`: `417` -> `14`
  - `explorer-browse-cards.tsx`: `211`
  - `explorer-browse-list.tsx`: `215`
  - `explorer-browse-surface-types.ts`: `106`
  - `explorer-browse-surface.test.tsx`: `81`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/explorer-browse-surface.tsx apps/web/src/components/files/explorer/explorer-browse-surface-types.ts apps/web/src/components/files/explorer/explorer-browse-cards.tsx apps/web/src/components/files/explorer/explorer-browse-list.tsx apps/web/src/components/files/explorer/explorer-browse-surface.test.tsx apps/web/src/components/files/explorer/explorer-browse-pane.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/explorer-browse-surface.test.tsx src/components/files/explorer/explorer-retrieval-props.test.ts src/components/files/explorer/file-preview-panel.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3063 BETTER_AUTH_URL=http://127.0.0.1:3063 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The browse surface entry file is now small and honest, but the cards and list
  owners are still meaningful local surfaces and the broader explorer/files
  runtime cluster remains one of the bigger structural areas.
