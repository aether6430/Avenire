# Tasks Workspace Shell Floor

Tags: tests, structure, reliability, tasks

## What changed

Added direct tests for:

- `apps/web/src/components/tasks/use-tasks-workspace.test.tsx`

Covered behavior:

- filtering tasks to the active workspace
- initial grouped-task state exposure from the hook
- route syncing when selecting a task
- route syncing when starting a new task
- route clearing when the sheet is closed
- delegation into shared mutation runtime for completion changes
- no-op drop-status behavior when the task already has the target status

## Why it mattered

`use-tasks-workspace.ts` is one of the central user-facing hooks in the tasks
surface and had no direct shell floor. Earlier passes extracted more of its
deterministic state and mutation helpers; this pass finally verifies that the
remaining hook shell actually wires those pieces together correctly.

That improves trust in the tasks workspace without needing a brittle browser
test harness.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/tasks/use-tasks-workspace.test.tsx`
- `node_modules/.bin/vitest run src/components/tasks/use-tasks-workspace.test.tsx src/components/tasks/tasks-workspace-runtime-model.test.ts src/components/tasks/tasks-workspace-model.test.ts src/components/tasks/tasks-workspace-client.test.ts src/components/tasks/tasks-mutation-runtime.test.ts src/components/dashboard/use-dashboard-task-manager.test.tsx src/components/dashboard/task-manager.test.tsx src/components/dashboard/dashboard-task-manager-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The tasks workspace hook now has a direct shell floor, but its store/effect
orchestration is still larger than ideal. The next follow-up in this area would
be either more extraction around the mount/reload effects or browser-level
interaction verification for drag/drop and sheet flows.
