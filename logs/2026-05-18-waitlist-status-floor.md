# Waitlist Status Floor

Tags: tests, reliability, public, onboarding

## What changed

Added direct coverage for:

- `apps/web/src/app/api/waitlist/status/route.test.ts`

New directly covered behavior:

- fail-closed `status: "none"` when no email is provided
- normalized email lookups against waitlist status and entry records
- fail-open fallback to `status: "none"` when waitlist lookups throw

## Why it mattered

The waitlist status endpoint is part of the public onboarding loop. Before this
pass, it had no direct floor, which meant one of the most user-visible “did I
get in yet?” paths could quietly drift without evidence.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/waitlist/status/route.test.ts`
- `node_modules/.bin/vitest run src/app/api/waitlist/status/route.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The waitlist request/status server paths now have direct floors, but the public
landing and surrounding conversion UX still remain lighter than the server-side
behavior beneath them.
