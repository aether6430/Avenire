# Workspace Event Stream Split

Tags: structure, tests, reliability, verification

## What changed

Split `apps/web/src/lib/workspace-event-stream.ts` into:

- `apps/web/src/lib/workspace-event-stream-model.ts`
- `apps/web/src/lib/workspace-event-stream-model.test.ts`
- `apps/web/src/lib/workspace-event-stream-runtime.ts`
- `apps/web/src/lib/workspace-event-stream-runtime.test.ts`

The original `workspace-event-stream.ts` now acts as a thin public surface.

Moved:

- stream key construction
- positive integer config parsing
- redis stream entry parsing into workspace events
- publisher/subscriber redis client orchestration
- publish/list/wait stream flows

## Why it mattered

This path is central shared realtime infrastructure used by uploads, flashcards,
chat, and route streaming. The split isolates pure parsing/model behavior from
redis runtime behavior and gives the event stream its first direct tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/workspace-event-stream.ts apps/web/src/lib/workspace-event-stream-model.ts apps/web/src/lib/workspace-event-stream-model.test.ts apps/web/src/lib/workspace-event-stream-runtime.ts apps/web/src/lib/workspace-event-stream-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/workspace-event-stream-model.test.ts src/lib/workspace-event-stream-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The workspace event stream surface is now structurally cleaner. The next useful
follow-up would be route-level integration coverage for the SSE consumers, not
more surgery inside the stream modules themselves.
