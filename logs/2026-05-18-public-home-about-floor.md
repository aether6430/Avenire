# Public Home And About Floor

Tags: tests, public, ux, marketing

## What changed

Added direct coverage for:

- `apps/web/src/app/page.test.tsx`
- `apps/web/src/app/about/page.test.tsx`

New directly covered behavior:

- public home metadata and structured-data script
- landing page handoff on the home route
- about-page metadata and force-static contract
- rendering the vision markdown inside the marketing shell/frame

## Why it mattered

These are two of the most public product surfaces in the repo. They were still
sitting at zero direct floor despite being exactly the kind of pages that shape
first impressions of product coherence.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/page.test.tsx apps/web/src/app/about/page.test.tsx`
- `node_modules/.bin/vitest run src/app/page.test.tsx src/app/about/page.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

These are still contract/render floors, not browser-level visual verification of
the landing experience.
