# Explorer Dead Slice Removal

Tags: structure, verification

## What changed

- Removed dead local baggage from `apps/web/src/components/files/explorer.tsx`:
  - unused local constants
  - unused local helper functions
  - unused local upload / webkit / invalidation type declarations
- Kept the live behavior in the extracted hook/module boundaries that already
  own this logic elsewhere in the repo.

## Why it mattered

`explorer.tsx` is still the largest obvious authenticated-shell hotspot. This
pass did not invent a new abstraction; it removed code that no longer pulled
its weight, which makes the file easier to scan and lowers future change
friction.

## Verification

- `wc -l apps/web/src/components/files/explorer.tsx`
  - before: `686`
  - after: `375`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... BETTER_AUTH_URL=http://127.0.0.1:3032 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3032 RESEND_API_KEY=... BETTER_AUTH_SECRET=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- `explorer.tsx` is materially smaller now, but it is still the single largest
  app-level shell hotspot in the current matrix.
