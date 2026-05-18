# Marketing Page Shell Floor

Tags: tests, public, marketing, layout

## What changed

Added direct coverage for:

- `apps/web/src/components/marketing/page-shell.test.tsx`

New directly covered behavior:

- navbar/footer shell rendering
- optional divider rendering after nav
- frame wrapper rendering with overridable section/frame/content classes

## Why it mattered

These wrappers shape several public-facing pages at once, including about,
privacy, terms, and roadmap. A small direct floor here improves confidence in a
shared public layout surface instead of only isolated pages.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/marketing/page-shell.test.tsx`
- `node_modules/.bin/vitest run src/components/marketing/page-shell.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This is still a render-level floor rather than browser-level verification of the
full marketing page experience.
