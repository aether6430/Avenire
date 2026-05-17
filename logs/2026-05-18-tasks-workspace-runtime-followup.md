# Tasks Workspace Runtime Follow-up

Tags: tests, structure, reliability, tasks

## What changed

Extended `apps/web/src/components/tasks/tasks-workspace-runtime-model.ts` with
more of the deterministic UI-state logic still living in
`use-tasks-workspace.ts`.

Added direct coverage for:

- search-param driven edit-mode activation
- draft sync behavior while editing a selected task
- drag-end reset state
- drop-status reset and no-op detection when the task already has the target
  status

Files changed:

- `apps/web/src/components/tasks/tasks-workspace-runtime-model.ts`
- `apps/web/src/components/tasks/tasks-workspace-runtime-model.test.ts`
- `apps/web/src/components/tasks/use-tasks-workspace.ts`

## Why it mattered

The earlier task-runtime extraction removed mutation and sheet-success logic,
but the hook still owned several deterministic state transitions around task
selection and drag/drop. This pass moves more of that logic into a directly
tested layer instead of leaving it buried in the hook.

That keeps shrinking the “black box” portion of the main tasks workspace
surface.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/tasks/tasks-workspace-runtime-model.ts apps/web/src/components/tasks/tasks-workspace-runtime-model.test.ts apps/web/src/components/tasks/use-tasks-workspace.ts`
- `node_modules/.bin/vitest run src/components/tasks/tasks-workspace-runtime-model.test.ts src/components/tasks/tasks-workspace-model.test.ts src/components/tasks/tasks-workspace-client.test.ts src/components/tasks/tasks-mutation-runtime.test.ts src/components/dashboard/use-dashboard-task-manager.test.tsx src/components/dashboard/task-manager.test.tsx src/components/dashboard/dashboard-task-manager-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

`use-tasks-workspace.ts` is still a large hook with effect orchestration around
store priming/reloading and route syncing. The mutation and local UI-state
branches are cleaner now, but a future pass could still reduce the remaining
effect glue.
