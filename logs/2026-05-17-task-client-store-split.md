# Task Client Store Split

Tags: structure, tests, reliability, client-runtime

## What changed

Split `apps/web/src/lib/task-client-store.ts` into:

- `apps/web/src/lib/task-client-store-model.ts`
- `apps/web/src/lib/task-client-store-model.test.ts`
- `apps/web/src/lib/task-client-store-runtime.ts`
- `apps/web/src/lib/task-client-store-runtime.test.ts`

`task-client-store.ts` now acts as a thin public surface that re-exports the
runtime API used by dashboard/tasks consumers.

Moved model behavior:

- task store snapshot type/default state
- task sorting with completed-at-top preferences
- primed snapshot creation from browser cache
- patch/upsert/remove/error snapshot transitions
- error message normalization

Moved runtime behavior:

- singleton client-store state and subscriptions
- browser cache hydration/writes
- reload fetch orchestration
- toast error surfacing
- public patch/upsert/remove store updates

## Why it mattered

This path sits underneath the dashboard and tasks workspace surfaces, but it had
no direct test floor and mixed pure task ordering logic with browser-side store
orchestration. The split makes the state transitions independently testable and
keeps the public module much thinner.

## Verification

- `node_modules/.bin/biome check apps/web/src/lib/task-client-store.ts apps/web/src/lib/task-client-store-model.ts apps/web/src/lib/task-client-store-model.test.ts apps/web/src/lib/task-client-store-runtime.ts apps/web/src/lib/task-client-store-runtime.test.ts`
- `node_modules/.bin/vitest run src/lib/task-client-store-model.test.ts src/lib/task-client-store-runtime.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `/Users/johnmacartew/Developer.nosync/aveniri/node_modules/.bin/tsc -p tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The core store layer now has direct tests. The next better investment here
would be integration coverage around hooks like `use-tasks-workspace` and
dashboard task flows, rather than splitting this store further.
