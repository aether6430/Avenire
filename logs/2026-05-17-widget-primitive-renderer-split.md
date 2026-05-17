# Widget Primitive Renderer Split

Tags: structure, verification

## What changed

- Reduced `WidgetPrimitiveRenderer.tsx` to a thin public renderer wrapper.
- Split the old mixed rendering surface into local owners:
  - `WidgetPrimitiveRenderer.tsx`
  - `widget-primitive-render-content.tsx`
  - `widget-primitive-render-chart.tsx`
- Added a focused wrapper test:
  - `WidgetPrimitiveRenderer.test.tsx`

## Why it mattered

The old primitive renderer mixed:

- public renderer entry
- recursive node rendering
- chart rendering
- card/text/table/progress/callout surface ownership

This pass keeps the public renderer honest while making the recursive content
owner and chart owner explicit local boundaries.

## Verification

- line counts:
  - `WidgetPrimitiveRenderer.tsx`: `457` -> `12`
  - `widget-primitive-render-content.tsx`: `348`
  - `widget-primitive-render-chart.tsx`: `115`
  - `WidgetPrimitiveRenderer.test.tsx`: `31`
- `node_modules/.bin/biome check apps/web/src/components/WidgetPrimitiveRenderer.tsx apps/web/src/components/WidgetPrimitiveRenderer.test.tsx apps/web/src/components/widget-primitive-render-content.tsx apps/web/src/components/widget-primitive-render-chart.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/WidgetPrimitiveRenderer.test.tsx src/components/widget-renderer-model.test.ts`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3072 BETTER_AUTH_URL=http://127.0.0.1:3072 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The public renderer is now tiny and honest, but the extracted content owner
  remains a meaningful local rendering surface because it still holds the
  recursive node rendering tree.
