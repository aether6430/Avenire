# Share Dialog Ownership Split

Tags: structure, files, ux, verification

## What changed

Split the explorer share dialog into a thin public wrapper and local owners for
file, folder, and workspace sharing surfaces. Network calls now live in a small
share client, workspace member state has a dedicated hook/model, and suggestion
loading is shared through a local hook.

The public `ShareDialog` API stayed stable while the root component now only
routes the trigger/open state to the correct content owner.

## Why it mattered

The old share dialog mixed file grants, folder links, workspace invites, member
loading, copy, and trigger rendering in one component. That made an important
collaboration surface harder to verify and easy to regress. The split gives each
sharing mode a clearer owner and makes the user-facing copy more explicit.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/files/explorer/share-dialog.tsx apps/web/src/components/files/explorer/share-dialog-client.ts apps/web/src/components/files/explorer/share-dialog-client.test.ts apps/web/src/components/files/explorer/share-dialog-copy.test.tsx apps/web/src/components/files/explorer/share-dialog-file-content.tsx apps/web/src/components/files/explorer/share-dialog-folder-content.tsx apps/web/src/components/files/explorer/share-dialog-workspace-content.tsx apps/web/src/components/files/explorer/share-dialog-workspace-model.ts apps/web/src/components/files/explorer/share-dialog-workspace-model.test.ts apps/web/src/components/files/explorer/use-share-dialog-workspace-content.ts apps/web/src/components/files/explorer/use-share-suggestion-list.ts` passed.
- `node_modules/.bin/vitest run src/components/files/explorer/share-dialog-client.test.ts src/components/files/explorer/share-dialog-workspace-model.test.ts src/components/files/explorer/share-dialog-copy.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose` passed.
- `git diff --check -- apps/web/src/components/files/explorer/share-dialog.tsx apps/web/src/components/files/explorer/share-dialog-client.ts apps/web/src/components/files/explorer/share-dialog-client.test.ts apps/web/src/components/files/explorer/share-dialog-copy.test.tsx apps/web/src/components/files/explorer/share-dialog-file-content.tsx apps/web/src/components/files/explorer/share-dialog-folder-content.tsx apps/web/src/components/files/explorer/share-dialog-workspace-content.tsx apps/web/src/components/files/explorer/share-dialog-workspace-model.ts apps/web/src/components/files/explorer/share-dialog-workspace-model.test.ts apps/web/src/components/files/explorer/use-share-dialog-workspace-content.ts apps/web/src/components/files/explorer/use-share-suggestion-list.ts` passed.

## Remaining concerns

Full web typecheck remains unreliable in this iCloud-managed Desktop checkout,
so this pass is verified with focused lint and focused tests rather than a broad
typecheck/build gate.
