# Waitlist Page Client Floor

Tags: tests, ux, public, onboarding

## What changed

Added direct coverage for:

- `apps/web/src/components/auth/waitlist-page-client.test.tsx`

New directly covered behavior:

- visible public waitlist invite surface copy
- particle-field presence on the public waitlist page
- waitlist CTA rendering
- terms/privacy links rendering
- dialog and waitlist form staying hidden before the CTA is opened

## Why it mattered

The waitlist server paths were stronger already, but the public onboarding shell
itself still lacked a direct floor. This pass improves confidence in what
visitors actually see when they hit the invite-only entrypoint.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/auth/waitlist-page-client.test.tsx`
- `node_modules/.bin/vitest run src/components/auth/waitlist-page-client.test.tsx src/app/waitlist/page.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a server-render floor, not a browser-interaction floor. The next
stronger follow-up for the waitlist surface would be interactive verification of
the modal open path and form submission UX.
