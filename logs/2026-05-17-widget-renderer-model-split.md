# Widget Renderer Model Split

Tags: structure, verification

## What changed

- Reduced `widget-renderer-model.ts` to the public widget-renderer surface.
- Split the old mixed-responsibility model into local owners:
  - `widget-renderer-model.ts`
  - `widget-renderer-theme.ts`
  - `widget-renderer-iframe-document.ts`

## Why it mattered

The old `widget-renderer-model.ts` mixed several genuinely different concerns:

- theme-var extraction
- CSS-var serialization
- canvas/theme token assembly
- SVG class theme definitions
- iframe HTML document assembly

This pass keeps the public API stable while giving the theme layer and iframe
document layer their own explicit owners.

## Verification

- line counts:
  - `widget-renderer-model.ts`: `535` -> `17`
  - `widget-renderer-theme.ts`: `242`
  - `widget-renderer-iframe-document.ts`: `290`
  - note: this is an ownership split, not a net LOC reduction for the whole
    local cluster
- `node_modules/.bin/biome check apps/web/src/components/widget-renderer-model.ts apps/web/src/components/widget-renderer-theme.ts apps/web/src/components/widget-renderer-iframe-document.ts apps/web/src/components/widget-renderer-model.test.ts`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/widget-renderer-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3070 BETTER_AUTH_URL=http://127.0.0.1:3070 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The public model file is now tiny and honest, but the iframe document owner
  is still a large local file because it contains the embedded widget runtime
  HTML/CSS/JS template.
