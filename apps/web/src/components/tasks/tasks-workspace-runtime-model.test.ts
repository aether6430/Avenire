import { describe, expect, it } from "vitest";
import {
  buildOptimisticTaskStatusUpdate,
  resolveTasksWorkspaceClosedSheetState,
  resolveTasksWorkspaceCreateState,
  resolveTasksWorkspaceDeleteSuccess,
  resolveTasksWorkspaceEditState,
  resolveTasksWorkspaceSaveSuccess,
} from "@/components/tasks/tasks-workspace-runtime-model";

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    assignee: null,
    assigneeUserId: "user-1",
    completedAt: null,
    createdAt: "2026-05-17T08:00:00.000Z",
    createdBy: "user-1",
    description: null,
    dueAt: "2026-05-17T12:00:00.000Z",
    id: "task-1",
    priority: "normal",
    resources: [],
    status: "planned",
    title: "Study",
    updatedAt: "2026-05-17T08:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

describe("tasks workspace runtime model", () => {
  it("builds optimistic task status updates with completed timestamps only for completed status", () => {
    expect(
      buildOptimisticTaskStatusUpdate({
        nextStatus: "completed",
        nowIso: "2026-05-17T12:00:00.000Z",
        task: buildTask(),
      })
    ).toMatchObject({
      completedAt: "2026-05-17T12:00:00.000Z",
      status: "completed",
    });

    expect(
      buildOptimisticTaskStatusUpdate({
        nextStatus: "planned",
        nowIso: "2026-05-17T12:00:00.000Z",
        task: buildTask({ completedAt: "2026-05-17T10:00:00.000Z" }),
      })
    ).toMatchObject({
      completedAt: null,
      status: "planned",
    });
  });

  it("resolves create/edit selection states and save/delete success states", () => {
    expect(resolveTasksWorkspaceCreateState("user-1")).toMatchObject({
      mode: "create",
      routeTaskId: null,
      selectedTaskId: null,
      sheetOpen: true,
    });

    expect(
      resolveTasksWorkspaceEditState({
        currentUserId: "user-1",
        selectedTask: buildTask({ id: "task-2", title: "Polish" }),
        taskId: "task-2",
      })
    ).toMatchObject({
      mode: "edit",
      routeTaskId: "task-2",
      selectedTaskId: "task-2",
      sheetOpen: true,
    });

    expect(
      resolveTasksWorkspaceSaveSuccess({
        currentUserId: "user-1",
        mode: "create",
        savedTask: buildTask({ id: "task-3" }),
      })
    ).toEqual({
      draft: null,
      mode: "idle",
      routeTaskId: null,
      selectedTaskId: null,
      sheetOpen: false,
    });

    expect(
      resolveTasksWorkspaceSaveSuccess({
        currentUserId: "user-1",
        mode: "edit",
        savedTask: buildTask({ id: "task-4", title: "Revise" }),
      })
    ).toMatchObject({
      mode: "edit",
      routeTaskId: "task-4",
      selectedTaskId: "task-4",
      sheetOpen: true,
    });

    expect(resolveTasksWorkspaceDeleteSuccess()).toEqual({
      draft: null,
      mode: "idle",
      routeTaskId: null,
      selectedTaskId: null,
      sheetOpen: false,
    });
  });

  it("closes the mobile sheet conservatively for create versus edit modes", () => {
    const draft = {
      assigneeUserId: "user-1",
      description: "draft",
      dueAt: "",
      priority: "normal",
      resources: [],
      selectedAssignee: null,
      status: "planned",
      title: "Draft",
    };

    expect(
      resolveTasksWorkspaceClosedSheetState({
        draft,
        mode: "create",
      })
    ).toEqual({
      draft: null,
      routeTaskId: null,
      sheetOpen: false,
    });

    expect(
      resolveTasksWorkspaceClosedSheetState({
        draft,
        mode: "edit",
      })
    ).toMatchObject({
      draft: expect.objectContaining({ title: "Draft" }),
      routeTaskId: null,
      sheetOpen: false,
    });
  });
});
