# Chat Tools Note Path Helper Split

Tags: structure, tests, reliability, verification

## What changed

Split note/path/tag helpers and workspace-file helper logic out of
`apps/web/src/lib/chat-tools/index.ts` into dedicated local modules:

- `apps/web/src/lib/chat-tools/note-file-helpers.ts`
- `apps/web/src/lib/chat-tools/workspace-file-helpers.ts`

Added focused tests for:

- note filename/title normalization
- note destination parsing
- note heading cleanup
- tag directive parsing
- workspace path normalization
- folder/file hint resolution
- target note selection
- retrieval citation path mapping

## Why it mattered

`chat-tools/index.ts` was a multi-domain god file mixing AI orchestration with
low-level note/path parsing and workspace file lookup logic. Pulling the helper
layers outward makes the tool runtime easier to reason about, easier to verify,
and less fragile to future note-agent changes.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/note-file-helpers.ts apps/web/src/lib/chat-tools/workspace-file-helpers.ts apps/web/src/lib/chat-tools/note-file-helpers.test.ts apps/web/src/lib/chat-tools/workspace-file-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/note-file-helpers.test.ts src/lib/chat-tools/workspace-file-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` is still large and still mixes
misconception handling, flashcard generation, and agent orchestration. This
pass only moves the note/path/workspace helper layer.
