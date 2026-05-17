# Dashboard Task Manager Floor

Tags: tests, structure, reliability, tasks

## What changed

Strengthened the dashboard task manager path in two ways:

- moved due-today filtering/sorting into
  `apps/web/src/components/dashboard/dashboard-task-manager-model.ts`
- added direct hook coverage for
  `apps/web/src/components/dashboard/use-dashboard-task-manager.ts`

New/expanded tests:

- `apps/web/src/components/dashboard/dashboard-task-manager-model.test.ts`
- `apps/web/src/components/dashboard/use-dashboard-task-manager.test.tsx`

Covered behavior:

- due-today task selection respects workspace scoping and
  `completedTasksAtTop`
- optimistic completion toggles patch the task store and reload on success
- failed completion toggles roll back and surface task errors
- failed deletes restore the removed task and surface task errors

## Why it mattered

This is a user-facing dashboard surface that sits on the “what needs my
attention today” workflow. Before this pass, the view state had minimal model
coverage and the hook’s optimistic mutation flows had no direct floor.

Now the critical behavior is less implicit and less dependent on indirect
confidence from surrounding component tests.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/dashboard/dashboard-task-manager-model.ts apps/web/src/components/dashboard/dashboard-task-manager-model.test.ts apps/web/src/components/dashboard/use-dashboard-task-manager.ts apps/web/src/components/dashboard/use-dashboard-task-manager.test.tsx`
- `node_modules/.bin/vitest run src/components/dashboard/dashboard-task-manager-model.test.ts src/components/dashboard/use-dashboard-task-manager.test.tsx src/components/dashboard/task-manager.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The dashboard task manager path is stronger now. The next natural follow-up in
the tasks area would be the larger `use-tasks-workspace.ts` runtime, which still
contains substantial UI-state and optimistic-mutation orchestration without a
direct test floor.
