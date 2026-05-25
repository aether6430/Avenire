import { describe, expect, it } from "vitest";
import {
  applyPatchedTaskToSnapshot,
  applyRemovedTaskFromSnapshot,
  applyTaskStoreError,
  applyUpsertedTaskToSnapshot,
  createPrimedTaskStoreSnapshot,
  DEFAULT_TASK_STORE_SNAPSHOT,
  sortWorkspaceTasksWithPreferences,
} from "@/lib/task-client-store-model";
import type { WorkspaceTask } from "@/lib/tasks";

function buildTask(
  overrides: Partial<WorkspaceTask> & Pick<WorkspaceTask, "id">
): WorkspaceTask {
  return {
    assignee: null,
    createdAt: "2026-05-17T10:00:00.000Z",
    createdBy: "user-1",
    dueAt: null,
    id: overrides.id,
    priority: "normal",
    resources: [],
    status: "planned",
    title: overrides.id,
    updatedAt: "2026-05-17T10:00:00.000Z",
    userId: "user-1",
    workspaceId: "workspace-1",
    ...overrides,
  } as WorkspaceTask;
}

describe("task client store model", () => {
  it("sorts workspace tasks using status, due date, priority, and created time", () => {
    const tasks = [
      buildTask({
        createdAt: "2026-05-17T10:02:00.000Z",
        id: "completed",
        priority: "high",
        status: "completed",
      }),
      buildTask({
        dueAt: "2026-05-18T12:00:00.000Z",
        id: "planned-late",
        status: "planned",
      }),
      buildTask({
        dueAt: "2026-05-17T08:00:00.000Z",
        id: "planned-early",
        status: "planned",
      }),
      buildTask({
        createdAt: "2026-05-17T09:00:00.000Z",
        id: "drafting-high",
        priority: "high",
        status: "drafting",
      }),
    ];

    expect(
      sortWorkspaceTasksWithPreferences(tasks, {
        completedTasksAtTop: false,
      }).map((task) => task.id)
    ).toEqual(["planned-early", "planned-late", "drafting-high", "completed"]);

    expect(
      sortWorkspaceTasksWithPreferences(tasks, {
        completedTasksAtTop: true,
      }).map((task) => task.id)
    ).toEqual(["completed", "planned-early", "planned-late", "drafting-high"]);
  });

  it("creates primed snapshots from cached tasks and keeps empty workspaces loading", () => {
    const cachedTasks = [
      buildTask({
        dueAt: "2026-05-19T10:00:00.000Z",
        id: "planned-late",
      }),
      buildTask({
        dueAt: "2026-05-17T10:00:00.000Z",
        id: "planned-early",
      }),
    ];

    expect(
      createPrimedTaskStoreSnapshot({
        cachedTasks,
        completedTasksAtTop: false,
        workspaceUuid: "workspace-1",
      })
    ).toMatchObject({
      errorMessage: null,
      loadFailed: false,
      loading: false,
      tasks: [cachedTasks[1], cachedTasks[0]],
      workspaceUuid: "workspace-1",
    });

    expect(
      createPrimedTaskStoreSnapshot({
        cachedTasks: null,
        completedTasksAtTop: false,
        workspaceUuid: "workspace-2",
      })
    ).toMatchObject({
      loading: true,
      tasks: [],
      workspaceUuid: "workspace-2",
    });
  });

  it("applies patch, upsert, remove, and error transitions without mutating other workspaces", () => {
    const initial = createPrimedTaskStoreSnapshot({
      cachedTasks: [
        buildTask({ id: "task-1" }),
        buildTask({ id: "task-2", status: "drafting" }),
      ],
      completedTasksAtTop: false,
      workspaceUuid: "workspace-1",
    });

    const patched = applyPatchedTaskToSnapshot({
      completedTasksAtTop: true,
      current: initial,
      taskId: "task-2",
      updater: (task) => ({ ...task, status: "completed" }),
      workspaceUuid: "workspace-1",
    });
    expect(patched.tasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);

    const resetForOtherWorkspace = applyUpsertedTaskToSnapshot({
      completedTasksAtTop: false,
      current: patched,
      task: buildTask({ id: "task-3", workspaceId: "workspace-2" }),
      workspaceUuid: "workspace-2",
    });
    expect(resetForOtherWorkspace).toMatchObject({
      errorMessage: null,
      loadFailed: false,
      loading: false,
      tasks: [expect.objectContaining({ id: "task-3" })],
      workspaceUuid: "workspace-2",
    });

    expect(
      applyRemovedTaskFromSnapshot({
        current: initial,
        taskId: "task-1",
        workspaceUuid: "workspace-2",
      })
    ).toBe(initial);

    expect(
      applyTaskStoreError(DEFAULT_TASK_STORE_SNAPSHOT, "Could not load tasks.")
    ).toMatchObject({
      errorMessage: "Could not load tasks.",
    });
  });
});
