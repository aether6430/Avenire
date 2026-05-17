# Chat Tools Workspace Agent Runtime Split

Tags: structure, tests, reliability, verification

## What changed

Split the workspace retrieval/file-manager execute branches out of
`apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts`

Moved:

- `search_materials` runtime
- `avenire_agent` runtime
- `file_manager_agent` runtime
- shared agent activity progress updates
- shared file-selection and preview-summary flow

## Why it mattered

This removes the largest remaining retrieval/file-manager runtime slab from the
central chat tool registry. `chat-tools/index.ts` now carries less direct
workspace-agent logic and is closer to a registry shell than a god module.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.ts apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts apps/web/src/lib/chat-tools/note-file-helpers.ts apps/web/src/lib/chat-tools/note-file-helpers.test.ts apps/web/src/lib/chat-tools/workspace-file-helpers.ts apps/web/src/lib/chat-tools/workspace-file-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts src/lib/chat-tools/chat-tool-study-runtime.test.ts src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts src/lib/chat-tools/note-file-helpers.test.ts src/lib/chat-tools/workspace-file-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` is now much thinner, but it still owns
the registry shell plus a few smaller branches such as due-cards and
visualization/widget helpers. Those are the next structural cleanup candidates.
