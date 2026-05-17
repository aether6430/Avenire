# Files Explorer Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the monolithic workspace files explorer into local models, hooks, surfaces, dialogs, preview panes, upload helpers, sharing helpers, and focused tests under `apps/web/src/components/files/explorer/`.

Also moved upload error-message handling into a lightweight `upload-error-message` module so explorer upload tests do not import the full storage-backed upload router just to classify failures.

## Why it mattered

The files explorer was a god surface that mixed routing, uploads, share dialogs, preview state, item actions, mobile gestures, realtime sync, and presentation policy in one place. The split makes the area easier to test and safer to change while keeping the public explorer entry point intact.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/files/explorer.tsx $(rg --files apps/web/src/components/files/explorer) apps/web/src/lib/upload-error-message.ts apps/web/src/lib/upload.ts apps/web/src/lib/upload-preflight.ts`
- `node_modules/.bin/vitest run src/components/files/explorer --maxWorkers 1 --no-fileParallelism --reporter verbose`

The final Vitest sweep passed 39 test files and 100 tests.

## Remaining concerns

The wider repository still has unrelated dirty work and dataless iCloud files. This pass only claims the files explorer runtime split and its lightweight upload-error dependency.
