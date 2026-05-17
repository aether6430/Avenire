# Circle To AI Search Overlay Model Extraction

Tags: structure, verification, tests

## What changed

- Extracted the pure overlay-state layer out of
  `use-circle-to-ai-search-overlay.ts` into:
  - `circle-to-ai-search-overlay-model.ts`
  - `circle-to-ai-search-overlay-model.test.ts`
- Moved ownership for:
  - overlay loading/transcript state
  - panel height and clamped panel positioning
  - initial panel anchor from a selection
  - selection usability validation
  - draft-submission eligibility
  - viewport panel positioning

## Why it mattered

`use-circle-to-ai-search-overlay.ts` sits directly on the files preview flow and
 mixed together pointer handlers, ephemeral chat transport, selection capture,
 panel math, and draft/overlay state rules. This pass left the eventful hook in
 place while moving the most reusable and failure-prone math/state rules into a
 local model file with tests.

## Verification

- line counts:
  - `use-circle-to-ai-search-overlay.ts`: `532` -> `540`
  - `circle-to-ai-search-overlay-model.ts`: `101`
  - `circle-to-ai-search-overlay-model.test.ts`: `84`
- `node_modules/.bin/biome check apps/web/src/components/files/use-circle-to-ai-search-overlay.ts apps/web/src/components/files/circle-to-ai-search-overlay-model.ts apps/web/src/components/files/circle-to-ai-search-overlay-model.test.ts apps/web/src/components/files/circle-to-ai-search-model.test.ts apps/web/src/components/files/apollo-circle-search-copy.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/files/circle-to-ai-search-overlay-model.test.ts src/components/files/circle-to-ai-search-model.test.ts src/components/files/apollo-circle-search-copy.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3053 BETTER_AUTH_URL=http://127.0.0.1:3053 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The hook still owns the pointer-event and snapshot/chat orchestration, so the
  overall file is not small yet. But the most reusable overlay-state rules are
  now explicit and test-backed.
