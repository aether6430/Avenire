# Particle Field Model Extraction

Tags: structure, verification, tests

## What changed

- Extracted the pure helper layer out of `particle-field.tsx` into:
  - `particle-field-model.ts`
  - `particle-field-model.test.ts`
- Moved ownership for:
  - theme-aware fill-color resolution
  - draw-box / cluster placement math
  - sparse-particle retention logic
  - spring-jitter generation
  - particle index shuffling

## Why it mattered

`particle-field.tsx` is one of the remaining larger app-facing files, but it is
 also one of the riskier runtime-heavy surfaces. This pass improved codability
 without touching the canvas lifecycle by moving the most reusable and
 failure-prone pure calculations into a local model with tests.

## Verification

- line counts:
  - `particle-field.tsx`: `619` -> `597`
  - `particle-field-model.ts`: `90`
  - `particle-field-model.test.ts`: `86`
- `node_modules/.bin/biome check apps/web/src/components/ui/particle-field.tsx apps/web/src/components/ui/particle-field-model.ts apps/web/src/components/ui/particle-field-model.test.ts apps/web/src/components/auth-shell.test.tsx`
  - passed
- `pnpm --filter @avenire/web exec vitest run src/components/ui/particle-field-model.test.ts src/components/auth-shell.test.tsx`
  - passed
- `pnpm --filter @avenire/web check-types --pretty false`
  - passed
- `DATABASE_URL=... NEXT_PUBLIC_APP_URL=http://127.0.0.1:3054 BETTER_AUTH_URL=http://127.0.0.1:3054 BETTER_AUTH_SECRET=... RESEND_API_KEY=... NODE_ENV=production pnpm --filter @avenire/web build`
  - passed

## Remaining concerns

- The pure helper layer is now explicit and test-backed, but the main
  `particle-field.tsx` runtime still owns the full canvas/image lifecycle and
  remains one of the denser remaining app-facing files.
