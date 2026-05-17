# Files Root Surface Model Split

Tags: structure, files, ux, tests, verification

## What changed

Split several files-root UI surfaces into smaller local owners and pure models:

- Circle to AI search overlay now delegates surface, popover, snapshot, and model logic.
- File thumbnails now delegate markdown/pdf/video/card rendering and markdown SVG preview generation.
- Pan/pinch image viewing now has a local model and hook boundary.
- Search result shaping now has a local model boundary for fast matches, retrieval mapping, metadata, and score labels.
- Upload activity now delegates panel runtime, mobile/desktop surfaces, body rendering, and status/empty-state policy.

The public entry files remain in place, but they are now much thinner and easier
to reason about.

## Why it mattered

These files-root components are visible, repeated product surfaces. They were
large enough to mix rendering, interaction policy, API/runtime glue, and copy in
one place. This pass makes those surfaces more codable while adding focused tests
for the pure policy and user-facing copy.

## Verification

- `node_modules/.bin/biome check` across the 37-file files-root slice passed.
- `node_modules/.bin/vitest run src/components/files/apollo-circle-search-copy.test.ts src/components/files/circle-to-ai-search-model.test.ts src/components/files/file-card-thumbnail-model.test.ts src/components/files/pan-pinch-image-model.test.ts src/components/files/search-model.test.ts src/components/files/stylized-search-bar-model.test.ts src/components/files/upload-activity-body.test.tsx src/components/files/upload-activity-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose` passed with 8 test files and 24 tests.
- `git diff --check` across the same files-root slice passed.

## Remaining concerns

This pass intentionally excludes the much larger `components/files/explorer/`
runtime split, which remains a separate broad workstream.
