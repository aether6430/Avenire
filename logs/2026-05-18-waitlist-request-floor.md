# Waitlist Request Floor

Tags: tests, reliability, public, onboarding

## What changed

Added direct coverage for the public waitlist request flow:

- `apps/web/src/app/api/waitlist/waitlist-route-model.test.ts`
- `apps/web/src/app/api/waitlist/request/waitlist-request-route-post.test.ts`

New directly covered behavior:

- trimmed/fail-closed waitlist email parsing
- localhost-to-public waitlist email URL normalization
- route error mapping for waitlist failures
- fail-closed missing-email waitlist requests
- pending waitlist requests that send welcome email
- non-pending waitlist requests that skip email
- tolerant success path when welcome email delivery fails
- surfaced persistence failures from the waitlist request path

## Why it mattered

The waitlist request path is one of the most public entry points into the
product. Before this pass, both its parsing logic and its email/persistence
behavior were effectively unproven, which is exactly the kind of silent breakage
that makes a product feel unready from the outside.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/waitlist/waitlist-route-model.test.ts apps/web/src/app/api/waitlist/request/waitlist-request-route-post.test.ts`
- `node_modules/.bin/vitest run src/app/api/waitlist/waitlist-route-model.test.ts src/app/api/waitlist/request/waitlist-request-route-post.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The public waitlist request path now has a direct floor, but the surrounding
public landing and waitlist status surfaces remain lighter than the server-side
behavior underneath them.
