# Workspace File Share Floor

Tags: tests, reliability, sharing, public

## What changed

Added direct coverage for the public-facing workspace file share slice:

- `apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-model.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-context.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-handlers.test.ts`

New directly covered behavior:

- canonical file share URL building
- permission normalization and trimmed/fail-closed grant parsing
- unauthorized, forbidden, and missing-file context exits
- successful file share-context hydration
- public file-link creation
- fail-closed missing-email rejection for file grants
- successful editor/viewer file grants with email delivery
- missing-user grant rejection
- tolerant success path when share-email delivery fails

## Why it mattered

Workspace file sharing is a public-facing product path and one of the places
where access control, collaboration, and external sharing meet. Before this
pass, the slice had no direct floor, which meant both permission handling and
share-email delivery behavior were effectively unproven.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-model.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-context.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-handlers.test.ts`
- `node_modules/.bin/vitest run src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-model.test.ts src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-context.test.ts src/app/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-handlers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

This directly covers file sharing, but not the analogous folder share slice.
If we continue down the public sharing surface, that remains the next most
obvious sibling gap.
