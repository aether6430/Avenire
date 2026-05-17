# Shared Resource Duplicate Floor

Tags: tests, reliability, sharing, public

## What changed

Added direct coverage for the public shared-resource duplication flow:

- `apps/web/src/app/api/share/[token]/duplicate/route.test.ts`
- `apps/web/src/app/api/share/[token]/duplicate/shared-resource-duplicate-file.test.ts`
- `apps/web/src/app/api/share/[token]/duplicate/shared-resource-duplicate-folder.test.ts`

New directly covered behavior:

- unauthorized, missing-share, forbidden, unsupported-resource, invalid-body,
  and missing-workspace exits in the duplicate route
- delegation to file-vs-folder duplication with correct destination route
  builders
- fail-closed file duplication when the source file cannot be loaded
- markdown duplication from stored note content and storage fetch fallback
- non-markdown duplication through `registerFileAsset(...)`
- fail-closed folder duplication when the source tree or root clone cannot be
  loaded
- descendant folder cloning and file copying into the correct cloned folders

## Why it mattered

Shared duplication is a public-facing copy path that turns external access into
new internal workspace content. Before this pass, the route orchestration and
duplication helpers were effectively unproven even though they sit right on the
boundary between sharing, storage, and workspace creation flows.

## Verification

- `node_modules/.bin/biome check apps/web/src/app/api/share/[token]/duplicate/route.test.ts apps/web/src/app/api/share/[token]/duplicate/shared-resource-duplicate-file.test.ts apps/web/src/app/api/share/[token]/duplicate/shared-resource-duplicate-folder.test.ts`
- `node_modules/.bin/vitest run src/app/api/share/[token]/duplicate/route.test.ts src/app/api/share/[token]/duplicate/shared-resource-duplicate-file.test.ts src/app/api/share/[token]/duplicate/shared-resource-duplicate-folder.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The core duplicate path now has a direct floor, but the thin top-level share
page UX above this API still remains lighter than the server-side behavior it
depends on.
