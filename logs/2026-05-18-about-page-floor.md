# About Page Floor

Tags: tests, public, marketing

## What changed

Added direct coverage for:

- `apps/web/src/app/about/page.test.tsx`

New directly covered behavior:

- about page metadata
- `force-static` contract
- rendering the vision markdown inside the marketing shell/frame

## Why it mattered

The about page is one of the most public product surfaces. A direct floor here
helps keep the public narrative page from silently drifting.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/about/page.test.tsx`
- `node_modules/.bin/vitest run src/app/about/page.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a contract/render floor rather than browser-level visual
verification of the about page.
