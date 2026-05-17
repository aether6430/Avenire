# Tasks Mutation Runtime

Tags: tests, structure, reliability, tasks

## What changed

Extracted shared async optimistic-mutation orchestration for tasks into:

- `apps/web/src/components/tasks/tasks-mutation-runtime.ts`
- `apps/web/src/components/tasks/tasks-mutation-runtime.test.ts`

Then wired both task surfaces to it:

- `apps/web/src/components/tasks/use-tasks-workspace.ts`
- `apps/web/src/components/dashboard/use-dashboard-task-manager.ts`

Covered shared behavior:

- optimistic status patching
- rollback on failed status updates
- delete rollback on failure
- background reload on success
- completion side-effect callback on successful completion transitions

## Why it mattered

Before this pass, both the workspace tasks surface and the dashboard task
manager were carrying their own async mutation choreography. That meant the same
failure-prone orchestration existed in two places with slightly different local
logic.

This pass consolidates the risky part into one directly tested runtime and makes
the remaining hooks thinner and more trustworthy.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/tasks/tasks-mutation-runtime.ts apps/web/src/components/tasks/tasks-mutation-runtime.test.ts apps/web/src/components/tasks/tasks-workspace-runtime-model.ts apps/web/src/components/tasks/tasks-workspace-runtime-model.test.ts apps/web/src/components/tasks/use-tasks-workspace.ts apps/web/src/components/dashboard/use-dashboard-task-manager.ts apps/web/src/components/dashboard/use-dashboard-task-manager.test.tsx`
- `node_modules/.bin/vitest run src/components/tasks/tasks-mutation-runtime.test.ts src/components/tasks/tasks-workspace-runtime-model.test.ts src/components/tasks/tasks-workspace-model.test.ts src/components/tasks/tasks-workspace-client.test.ts src/components/dashboard/dashboard-task-manager-model.test.ts src/components/dashboard/use-dashboard-task-manager.test.tsx src/components/dashboard/task-manager.test.tsx --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The mutation choreography is stronger now, but `use-tasks-workspace.ts` still
owns a lot of effect-driven UI orchestration. The next worthwhile follow-up in
this area would be direct coverage or further extraction around route syncing,
sheet mode, and search/filter state transitions.
