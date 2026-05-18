# Homepage Floor

Tags: tests, public, marketing

## What changed

Added direct coverage for:

- `apps/web/src/app/page.test.tsx`

New directly covered behavior:

- home page metadata
- structured-data script rendering
- landing-page handoff

## Why it mattered

This is the single most public product surface. A compact direct floor here adds
real confidence without blowing the test-budget gate again.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/page.test.tsx`
- `node_modules/.bin/vitest run src/app/page.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a contract/render floor, not browser-level visual verification of
the landing experience.
