# Explorer File Action Operations Model Extraction

Tags: structure, verification

## What changed

- Extracted the pure action-policy layer out of
  `use-explorer-file-action-operations.ts` into:
  - `explorer-file-action-operations-model.ts`
- Added focused tests for the new local model:
  - `explorer-file-action-operations-model.test.ts`

## Why it mattered

This hook lives in the remaining files runtime cluster and still carried a few
pure decisions that did not need to stay embedded in the browser/runtime owner:

- folder move validation
- folder move history-entry assembly
- bulk mutation success filtering and total-count resolution
- hard re-ingest file selection
- hard re-ingest success copy

This pass keeps the hook as the owner of async transports, explorer refreshes,
and toast side effects while moving the policy layer into a directly testable
local model.

## Verification

- line counts:
  - `use-explorer-file-action-operations.ts`: `443` -> `422`
  - `explorer-file-action-operations-model.ts`: `102`
  - `explorer-file-action-operations-model.test.ts`: `139`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/explorer-file-action-operations-model.ts apps/web/src/components/files/explorer/explorer-file-action-operations-model.test.ts apps/web/src/components/files/explorer/use-explorer-file-action-operations.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/explorer-file-action-operations-model.test.ts src/components/files/explorer/workspace-bulk-operations-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3066 BETTER_AUTH_URL=http://127.0.0.1:3066 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- `use-explorer-file-action-operations.ts` is now smaller and more explicit,
  but it still owns the real async mutation and explorer refresh orchestration
  in the files runtime path.
