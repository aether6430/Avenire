# Rolling Tool Activity Ownership Split

Tags: structure, verification

## What changed

- Reduced `apps/web/src/components/chat/rolling-tool-activity-surface.tsx` to
  a thin export surface.
- Split the old mixed-responsibility file into local ownership pieces:
  - `rolling-tool-activity-body.tsx`
  - `rolling-tool-activity-explore-block.tsx`
  - `rolling-tool-activity-mutation-block.tsx`
  - `rolling-tool-activity-shared.ts`
- Added a focused surface test to prove:
  - tool parts still flow through `toRollingToolAction`
  - grouped actions still render through the live surface

## Why it mattered

The old chat activity surface mixed conversion, grouping, explore rendering,
mutation rendering, preview accordions, shared constants, and duplicate-key
handling in one file. This pass kept the public export tiny while preserving
the actual cluster locally, which makes future activity-surface changes easier
to reason about without inventing a new abstraction layer.

## Verification

- line counts:
  - `rolling-tool-activity-surface.tsx`: `648` -> `6`
  - `rolling-tool-activity-body.tsx`: `112`
  - `rolling-tool-activity-explore-block.tsx`: `365`
  - `rolling-tool-activity-mutation-block.tsx`: `164`
  - `rolling-tool-activity-shared.ts`: `24`
- `node_modules/.bin/biome check apps/web/src/components/chat/rolling-tool-activity-surface.tsx apps/web/src/components/chat/rolling-tool-activity-body.tsx apps/web/src/components/chat/rolling-tool-activity-explore-block.tsx apps/web/src/components/chat/rolling-tool-activity-mutation-block.tsx apps/web/src/components/chat/rolling-tool-activity-shared.ts apps/web/src/components/chat/rolling-tool-activity.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/rolling-tool-activity.test.tsx src/components/chat/rolling-tool-activity-model.test.ts src/components/chat/tool-part-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3045 BETTER_AUTH_URL=http://127.0.0.1:3045 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The root surface is now tiny and honest, but the explore block is still a
  fairly dense local owner and broader structural pressure still remains in
  `markdown.tsx`, `particle-field.tsx`, the student-calendar desktop surface,
  and the explorer cluster.
