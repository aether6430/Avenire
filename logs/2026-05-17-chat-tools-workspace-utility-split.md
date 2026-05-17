# Chat Tools Workspace Utility Split

Tags: structure, tests, reliability, verification

## What changed

Split the remaining workspace-facing utility/runtime branches out of
`apps/web/src/lib/chat-tools/index.ts` into:

- `apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts`
- `apps/web/src/lib/chat-tools/chat-tool-due-cards-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts`
- `apps/web/src/lib/chat-tools/chat-tool-utility-runtime.ts`
- `apps/web/src/lib/chat-tools/chat-tool-utility-runtime.test.ts`

Moved:

- `search_materials`
- `avenire_agent`
- `file_manager_agent`
- `get_due_cards`
- `web_search`
- `load_skill`
- `visualize_read_me`
- `show_widget`

## Why it mattered

This takes the last large retrieval/file-manager/utility execute branches out of
the central chat tool registry. `apps/web/src/lib/chat-tools/index.ts` is now
much closer to a thin tool-registration shell, which makes future behavior
changes less risky and the area more navigable.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/chat-tools/index.ts apps/web/src/lib/chat-tools/chat-tool-due-cards-runtime.ts apps/web/src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-utility-runtime.ts apps/web/src/lib/chat-tools/chat-tool-utility-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.ts apps/web/src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.ts apps/web/src/lib/chat-tools/chat-tool-study-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.ts apps/web/src/lib/chat-tools/chat-tool-misconception-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.ts apps/web/src/lib/chat-tools/chat-tool-note-runtime.test.ts apps/web/src/lib/chat-tools/chat-tool-models.ts apps/web/src/lib/chat-tools/chat-tool-models.test.ts apps/web/src/lib/chat-tools/study-tool-helpers.ts apps/web/src/lib/chat-tools/study-tool-helpers.test.ts apps/web/src/lib/chat-tools/note-file-helpers.ts apps/web/src/lib/chat-tools/note-file-helpers.test.ts apps/web/src/lib/chat-tools/workspace-file-helpers.ts apps/web/src/lib/chat-tools/workspace-file-helpers.test.ts`
- `node_modules/.bin/vitest run src/lib/chat-tools/chat-tool-due-cards-runtime.test.ts src/lib/chat-tools/chat-tool-utility-runtime.test.ts src/lib/chat-tools/chat-tool-workspace-agent-runtime.test.ts src/lib/chat-tools/chat-tool-note-agent-runtime.test.ts src/lib/chat-tools/chat-tool-study-runtime.test.ts src/lib/chat-tools/chat-tool-misconception-runtime.test.ts src/lib/chat-tools/chat-tool-note-runtime.test.ts src/lib/chat-tools/chat-tool-models.test.ts src/lib/chat-tools/study-tool-helpers.test.ts src/lib/chat-tools/note-file-helpers.test.ts src/lib/chat-tools/workspace-file-helpers.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`apps/web/src/lib/chat-tools/index.ts` is now close to a registration shell, but
the remaining inline area still deserves a final cleanup pass for copy/constants
and any surviving public exports or glue code.
