# Chat Tools Study Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split study generation runtime out of `apps/web/src/lib/chat-tools/index.ts`
into:

- `apps/web/src/lib/chat-tools/chat-tool-study-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts`

Moved:

- study source resolution from source text, file content, and retrieval hits
- study set selection/creation and card persistence
- flashcard generation from study material
- flashcard generation from misconception seeds
- quiz generation from study material

## Why it mattered

This removes another heavy user-facing runtime branch from the central
chat-tools god file. `index.ts` now owns less direct flashcard/study orchestration
and more clearly delegates to local modules.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-study-runtime.test.ts src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` still owns the large retrieval-agent,
file-manager, and note-agent execute branches. Those remain the next structural
pressure points.
