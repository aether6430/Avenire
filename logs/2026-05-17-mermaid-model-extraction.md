# Mermaid Model Extraction

Tags: structure, verification

## What changed

- Extracted the pure Mermaid helper and viewport-math layer out of
  `mermaid.tsx` into:
  - `mermaid-model.ts`
- Added focused tests for the new local model:
  - `mermaid-model.test.ts`

## Why it mattered

`mermaid.tsx` was mixing the actual UI/download interaction with pure helper
logic that did not need to stay embedded in the component:

- Mermaid label quote normalization
- unsafe SVG stripping fallback
- zoom state clamping and point-based transform math
- fit-to-screen view-state derivation

This pass keeps the component as the owner of real DOM parsing, rendering,
download, and interaction behavior while moving the pure policy layer into a
directly testable local model.

## Verification

- line counts:
  - `mermaid.tsx`: `428` -> `403`
  - `mermaid-model.ts`: `73`
  - `mermaid-model.test.ts`: `66`
- `node_modules/.bin/biome check apps/web/src/components/chat/mermaid.tsx apps/web/src/components/chat/mermaid-model.ts apps/web/src/components/chat/mermaid-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/chat/mermaid-model.test.ts src/components/chat/markdown-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3067 BETTER_AUTH_URL=http://127.0.0.1:3067 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- `mermaid.tsx` is now smaller and clearer, but it still owns the real SVG
  render lifecycle, drag/zoom interaction, and download behavior.
