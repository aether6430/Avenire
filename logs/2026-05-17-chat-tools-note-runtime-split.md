# Chat Tools Note Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split note-runtime behavior out of `apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts`

Moved:

- note draft generation
- note rewrite generation
- file tag update mutation logic
- note-folder resolution
- ingestion enqueue event publishing

Added focused tests for:

- note draft cleanup
- note rewrite pass-through
- tag mutation payload behavior
- folder resolution vs Notes fallback
- ingestion event publishing

## Why it mattered

The chat tools file still mixed orchestration with note-specific runtime
mutation behavior. Moving this layer outward reduces the coupling between tool
registration and the actual note workflow implementation.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` still owns the large execute branches for
study generation, misconception operations, and file-manager flows. Those are
the next structural extraction targets.
