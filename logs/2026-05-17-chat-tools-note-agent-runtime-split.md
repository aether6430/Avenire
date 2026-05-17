# Chat Tools Note Agent Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the `note_agent` execute branch out of
`apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts`

Moved:

- note create flow
- note read flow
- note update flow
- default note listing flow
- note tag updates and ingestion refresh wiring

## Why it mattered

`chat-tools/index.ts` no longer needs to carry the full note-agent runtime
branch inline. That makes the chat tool registry thinner and keeps note-specific
mutation behavior in a focused local module with direct tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts apps/web/src/lib/chat-tools/note-file-helpers.ts apps/web/src/lib/chat-tools/note-file-helpers.test.ts apps/web/src/lib/chat-tools/workspace-file-helpers.ts apps/web/src/lib/chat-tools/workspace-file-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts src/lib/chat-tools/chat-tool-study-runtime.test.ts src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts src/lib/chat-tools/note-file-helpers.test.ts src/lib/chat-tools/workspace-file-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` still owns the larger retrieval-agent and
file-manager execute branches plus the lightweight registry shell. Those remain
the next structural extraction targets.
