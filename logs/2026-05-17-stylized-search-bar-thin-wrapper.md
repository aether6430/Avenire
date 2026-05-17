# Stylized Search Bar Thin Wrapper

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/files/stylized-search-bar.tsx` to a thin
  wrapper around the already-existing local runtime and a new dedicated surface:
  - `use-stylized-search-bar.ts`
  - `stylized-search-bar-surface.tsx`
- Preserved the exported `WorkspaceSearchItem` and `WorkspaceSearchResult`
  types from the wrapper for downstream imports.
- Added a wrapper-level test to confirm the runtime hook is wired into the
  surface.

## Why it mattered

`stylized-search-bar.tsx` had become a large combined runtime/render module even
though the search runtime already lived nearby. This pass separated the shell
from the runtime without changing the public component contract.

## Verification

- `wc -l apps/web/src/components/files/stylized-search-bar.tsx`
  - before: `812`
  - after: `69`
- `node_modules/.bin/biome check apps/web/src/components/files/stylized-search-bar.tsx apps/web/src/components/files/stylized-search-bar-surface.tsx apps/web/src/components/files/stylized-search-bar.test.tsx apps/web/src/components/files/use-stylized-search-bar.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/stylized-search-bar.test.tsx src/components/files/stylized-search-bar-model.test.ts src/components/files/search-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3039 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3039 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The wrapper is now small and honest, but the successful provider-backed
  method path and longer-lived signed-in durability remain broader product
  gaps.
