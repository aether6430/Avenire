# Chat Tools Study Helper Split

Tags: structure, tests, reliability, verification

## What changed

Split study/taxonomy/citation helpers and local chat-tool schemas/prompt
builders out of `apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/study-tool-helpers.ts`
- `apps/web/src/lib/chat-tools/chat-tool-models.ts`

Added focused tests for taxonomy matching, misconception formatting, citation
rendering, flashcard taxonomy inference, zod schema behavior, and prompt
generation.

## Why it mattered

`chat-tools/index.ts` was still acting like a kitchen-sink orchestration file.
This pass moves pure study and schema/prompt logic outward, making the AI tool
runtime easier to reason about and safer to keep refactoring in later passes.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` is still a large orchestration layer.
The remaining heavy areas are the actual tool execute blocks and study/file
manager flows, which should move in later passes.
