# Workspace Folder Share Floor

Tags: tests, reliability, sharing, public

## What changed

Added direct coverage for the public-facing workspace folder share slice:

- `apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-model.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-context.test.ts`
- `apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-handlers.test.ts`

New directly covered behavior:

- canonical folder share URL building
- permission normalization and trimmed/fail-closed grant parsing
- unauthorized, forbidden, and missing-folder context exits
- successful folder share-context hydration
- public folder-link creation
- fail-closed missing-email rejection for folder grants
- successful viewer/editor folder grants
- missing-user grant rejection

## Why it mattered

Folder sharing is a sibling public-sharing surface to file sharing and chat
sharing. Leaving it untested would keep a visible access-control and
collaboration path outside the trust floor we are building for public-ready
iteration.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-model.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-context.test.ts apps/web/src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-handlers.test.ts`
- `node_modules/.bin/vitest run src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-model.test.ts src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-context.test.ts src/app/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-handlers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The core public sharing slices are now much better covered, but the thin route
wrappers above them still remain lighter than the underlying internal handlers.
