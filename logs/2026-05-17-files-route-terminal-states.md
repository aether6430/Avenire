# Files Route Terminal States

Tags: ux, reliability, files, verification

## What changed

Tightened the files root and folder route clients so unresolved-but-terminal
states render explicit non-loading placeholders:

- bootstrap failure now says `Unable to load files.`
- missing workspace says `Workspace not found.`
- workspace without a root folder says `Workspace files unavailable.`
- malformed folder route params say `This file view isn't available.`

The real loading state remains reserved for route/bootstrap work that is still
in progress.

## Why it mattered

The files area is a core product surface. A terminal error shown as a loading
state makes the app feel stuck and unreliable. These route clients now fail
closed with clearer copy and `pending={false}`, which makes the product state
more honest.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/files/workspace-files-root-page-client.tsx apps/web/src/components/files/workspace-files-root-page-client.test.tsx apps/web/src/components/files/workspace-folder-route-page-client.tsx apps/web/src/components/files/workspace-folder-route-page-client.test.tsx` passed.
- `node_modules/.bin/vitest run src/components/files/workspace-files-root-page-client.test.tsx src/components/files/workspace-folder-route-page-client.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose` passed.
- `git diff --check -- apps/web/src/components/files/workspace-files-root-page-client.tsx apps/web/src/components/files/workspace-files-root-page-client.test.tsx apps/web/src/components/files/workspace-folder-route-page-client.tsx apps/web/src/components/files/workspace-folder-route-page-client.test.tsx` passed.

## Remaining concerns

This is a narrow UX/reliability pass. It does not claim broader files explorer
runtime completion.
