# Chat Tools Model Schema Split

Tags: structure, tests, reliability, verification

## What changed

Split study/taxonomy/citation helpers and chat-tool-local zod schema/prompt
builders out of `apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/study-tool-helpers.ts`
- `apps/web/src/lib/chat-tools/chat-tool-models.ts`

Added focused tests for:

- misconception key normalization
- taxonomy scope matching
- misconception context/source formatting
- citation markdown rendering
- flashcard taxonomy inference
- local zod schema behavior
- retrieval and file-manager selection prompt generation

## Why it mattered

`chat-tools/index.ts` still mixed orchestration with pure study logic and local
schema definitions. Moving those layers outward reduces cognitive load in the
tool runtime and makes future tool extraction less risky.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` still owns heavy execute blocks for note,
study, misconception, and file-manager flows. Those runtime branches remain the
next structural pressure points.
