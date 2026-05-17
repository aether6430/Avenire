# Tasks Workspace Runtime Model

Tags: tests, structure, reliability, tasks

## What changed

Extracted central runtime-transition logic out of `use-tasks-workspace.ts` into:

- `apps/web/src/components/tasks/tasks-workspace-runtime-model.ts`
- `apps/web/src/components/tasks/tasks-workspace-runtime-model.test.ts`

Also reused the shared optimistic status helper from the dashboard task manager:

- `apps/web/src/components/dashboard/use-dashboard-task-manager.ts`

Moved into the runtime model:

- optimistic task status mutation shape
- create/edit sheet-opening state
- save-success state for create vs edit flows
- delete-success reset state
- conservative sheet-close state

## Why it mattered

`use-tasks-workspace.ts` is still a large central hook, but this pass removes a
chunk of high-risk mutation/UI-transition logic from the hook body and makes it
directly testable. It also stops the dashboard task manager and workspace task
surface from hand-rolling separate optimistic completion updates.

That improves both structure and trust in a core product workflow.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/tasks/tasks-workspace-runtime-model.ts apps/web/src/components/tasks/tasks-workspace-runtime-model.test.ts apps/web/src/components/tasks/use-tasks-workspace.ts apps/web/src/components/dashboard/use-dashboard-task-manager.ts`
- `node_modules/.bin/vitest run src/components/tasks/tasks-workspace-runtime-model.test.ts src/components/tasks/tasks-workspace-model.test.ts src/components/tasks/tasks-workspace-client.test.ts src/components/dashboard/dashboard-task-manager-model.test.ts src/components/dashboard/use-dashboard-task-manager.test.tsx src/components/dashboard/task-manager.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The remaining big follow-up in the tasks area is still `use-tasks-workspace.ts`
itself. The hook now delegates more of its high-risk transitions, but it still
contains a large amount of effect orchestration and UI state without a direct
hook-level floor.
