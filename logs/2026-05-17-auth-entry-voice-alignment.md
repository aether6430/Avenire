# Auth Entry Voice Alignment

Tags: ui, product, verification

## What changed

- Updated the default auth-shell copy shared by `/login` and `/register`.
- Replaced the more ambient:
  - `A quieter internet`
  - `Built for people who prefer focus over noise.`
- With product-language that matches the public edge of Avenire:
  - `A study-first workspace`
  - `Built for deep study, research, and interactive reasoning.`
- Added a focused `auth-shell` test that locks the new welcome copy while
  preserving the onboarding-specific variant.

## Why it mattered

The login/register boundary is one of the first places where product voice gets
tested. This pass removed a small but visible seam where auth entry sounded
more editorial than the rest of the study/research workspace.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/auth-shell.tsx apps/web/src/components/auth-shell.test.tsx docs/product-coherence-audit-current.md docs/instruction-evidence-matrix-current.md docs/completion-audit-current.md`
- `pnpm --filter @avenire/web exec vitest run src/components/auth-shell.test.tsx src/app/(auth)/login/page.test.tsx src/app/(auth)/register/page.test.tsx`
- `pnpm --filter @avenire/web check-types --pretty false`

## Remaining concerns

- The auth-entry copy seam is closed, but the broader product goal still needs
  one successful provider-backed method round-trip and stronger longer-lived
  signed-in durability proof.
