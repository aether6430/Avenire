# Chat Tools Misconception Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split misconception runtime behavior out of `apps/web/src/lib/chat-tools/index.ts`
into:

- `apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts`

Moved:

- active misconception context lookup
- misconception logging
- misconception listing
- misconception resolve flow
- misconception improvement flow
- misconception seed resolution for downstream study generation

## Why it mattered

This removes another user-facing runtime branch from the central chat-tools
god file and isolates the direct `learning-data` interactions behind a local
module with focused tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` still owns the larger study generation,
retrieval-agent, and file-manager execute branches. Those remain the next
extraction targets.
