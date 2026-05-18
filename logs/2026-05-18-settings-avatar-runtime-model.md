# Settings Avatar Runtime Model

Tags: tests, structure, settings, account, avatar

## What changed

Extracted deterministic avatar helpers from:

- `apps/web/src/components/settings/use-settings-panel-avatar.ts`

into:

- `apps/web/src/components/settings/settings-avatar-runtime-model.ts`
- `apps/web/src/components/settings/settings-avatar-runtime-model.test.ts`

New directly covered behavior:

- session-based avatar preview source resolution
- display-avatar fallback resolution
- avatar fallback initials derivation
- avatar upload start / missing-url / saved / finish states
- uploaded URL normalization across `ufsUrl` and `url`

## Why it mattered

This trims more hidden deterministic logic out of a user-facing account surface
and makes avatar behavior easier to trust and change without re-parsing the hook
body.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-avatar-runtime-model.ts apps/web/src/components/settings/settings-avatar-runtime-model.test.ts apps/web/src/components/settings/use-settings-panel-avatar.ts`
- `node_modules/.bin/vitest run src/components/settings/settings-avatar-runtime-model.test.ts src/components/settings/settings-account-section.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The avatar hook now holds less deterministic branching, but the full upload
workflow still lacks a browser-interaction floor.
