# Share Dialog Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/files/explorer/share-dialog.tsx` to a thin
  coordinator around existing local content components:
  - `share-dialog-file-content.tsx`
  - `share-dialog-folder-content.tsx`
  - `share-dialog-workspace-content.tsx`
- Added a wrapper-level test for dialog routing behavior.

## Why it mattered

`share-dialog.tsx` had grown into a large monolith even though the real local
pieces already existed. This pass made the file reflect the actual ownership
shape instead of duplicating content logic in one oversized shell.

## Verification

- `wc -l apps/web/src/components/files/explorer/share-dialog.tsx`
  - before: `842`
  - after: `142`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/share-dialog.tsx apps/web/src/components/files/explorer/share-dialog.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/share-dialog.test.tsx src/components/files/explorer/share-dialog-copy.test.tsx src/components/files/explorer/share-dialog-client.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3033 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3033 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The file is no longer a hotspot, but `explorer.tsx` still remains the
  clearest structural shell target in this area.
