# Settings Account And Security Floor

Tags: tests, ux, settings, account, security

## What changed

Expanded direct coverage for:

- `apps/web/src/components/settings/settings-account-section.test.tsx`
- `apps/web/src/components/settings/settings-security-section.test.tsx`

New directly covered behavior:

- loaded profile controls and connected-provider rendering
- explicit empty connected-accounts state
- active sudo state copy
- listed passkey rendering
- active-session action rendering
- danger-zone status rendering
- explicit empty passkeys state

## Why it mattered

Account and security settings are core trust surfaces. The earlier tests only
covered loading and failure states. This pass raises confidence in what users
actually see once those sections are loaded and interactive.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/settings/settings-account-section.test.tsx apps/web/src/components/settings/settings-security-section.test.tsx`
- `node_modules/.bin/vitest run src/components/settings/settings-account-section.test.tsx src/components/settings/settings-security-section.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The render-layer floor is stronger now, but the effectful account/security hooks
behind these sections still remain a deeper future follow-up than static render
coverage.
