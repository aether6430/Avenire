# Explorer Upload Batch Model Extraction

Tags: structure, verification, tests

## What changed

- Extracted the most failure-prone pure queue-update logic out of
  `explorer-upload-batch.ts` into:
  - `explorer-upload-batch-model.ts`
  - `explorer-upload-batch-model.test.ts`
- Moved ownership for:
  - dedupe-hit queue updates
  - bulk-register success/failure queue updates
  - successful-register counting

## Why it mattered

`explorer-upload-batch.ts` sits on a core files flow and had important queue
state transitions embedded inline inside the async batch procedure. This pass
made those transitions explicit and testable without pulling the whole upload
flow into a speculative abstraction layer.

## Verification

- line counts:
  - `explorer-upload-batch.ts`: `492` -> `446`
  - `explorer-upload-batch-model.ts`: `92`
- `node_modules/.bin/biome check apps/web/src/components/files/explorer/explorer-upload-batch.ts apps/web/src/components/files/explorer/explorer-upload-batch-model.ts apps/web/src/components/files/explorer/explorer-upload-batch-model.test.ts apps/web/src/components/files/explorer/explorer-upload-batch.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/explorer/explorer-upload-batch.test.ts src/components/files/explorer/explorer-upload-batch-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3051 BETTER_AUTH_URL=http://127.0.0.1:3051 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The batch file is smaller and its queue transitions are now test-backed, but
  the broader explorer/files cluster still contains larger surfaces such as
  `file-preview-panel.tsx`, `use-circle-to-ai-search-overlay.ts`, and other
  remaining runtime-heavy paths.
