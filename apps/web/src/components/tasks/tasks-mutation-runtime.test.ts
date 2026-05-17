import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteWorkspaceTaskWithRollback,
  updateWorkspaceTaskStatusWithRollback,
} from "@/components/tasks/tasks-mutation-runtime";

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    completedAt: null,
    id: "task-1",
    status: "planned",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

describe("tasks mutation runtime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("optimistically patches task status, commits server results, and triggers completion side effects", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
    const patchWorkspaceTask = vi.fn();
    const persistTaskStatus = vi.fn().mockResolvedValue(
      buildTask({
        completedAt: "2026-05-17T12:00:00.000Z",
        status: "completed",
      })
    );
    const reloadWorkspaceTasks = vi.fn();
    const setWorkspaceTaskError = vi.fn();
    const upsertWorkspaceTask = vi.fn();
    const onCompleted = vi.fn();

    const result = await updateWorkspaceTaskStatusWithRollback({
      nextStatus: "completed",
      onCompleted,
      patchWorkspaceTask,
      persistTaskStatus,
      reloadWorkspaceTasks,
      setWorkspaceTaskError,
      task: buildTask(),
      upsertWorkspaceTask,
      workspaceId: "workspace-1",
    });

    expect(result).toMatchObject({ status: "completed" });
    expect(patchWorkspaceTask).toHaveBeenCalledWith(
      "workspace-1",
      "task-1",
      expect.any(Function)
    );
    const optimisticUpdater = patchWorkspaceTask.mock.calls[0]?.[2] as (
      task: ReturnType<typeof buildTask>
    ) => ReturnType<typeof buildTask>;
    expect(optimisticUpdater(buildTask())).toMatchObject({
      completedAt: "2026-05-17T12:00:00.000Z",
      status: "completed",
    });
    expect(upsertWorkspaceTask).toHaveBeenCalledWith(
      "workspace-1",
      expect.objectContaining({ status: "completed" })
    );
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(reloadWorkspaceTasks).toHaveBeenCalledWith("workspace-1", {
      background: true,
    });
    expect(setWorkspaceTaskError).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("rolls back failed status mutations and failed deletes", async () => {
    const patchWorkspaceTask = vi.fn();
    const persistTaskStatus = vi
      .fn()
      .mockRejectedValue(new Error("Failed to update task."));
    const reloadWorkspaceTasks = vi.fn();
    const setWorkspaceTaskError = vi.fn();
    const upsertWorkspaceTask = vi.fn();
    const task = buildTask();

    const updateResult = await updateWorkspaceTaskStatusWithRollback({
      nextStatus: "completed",
      patchWorkspaceTask,
      persistTaskStatus,
      reloadWorkspaceTasks,
      setWorkspaceTaskError,
      task,
      upsertWorkspaceTask,
      workspaceId: "workspace-1",
    });

    expect(updateResult).toBeNull();
    expect(upsertWorkspaceTask).toHaveBeenCalledWith("workspace-1", task);
    expect(setWorkspaceTaskError).toHaveBeenCalledWith(
      "Failed to update task."
    );

    const deleteTaskRecord = vi
      .fn()
      .mockRejectedValue(new Error("Failed to delete task."));
    const removeWorkspaceTask = vi.fn();
    const deleteResult = await deleteWorkspaceTaskWithRollback({
      deleteTaskRecord,
      reloadWorkspaceTasks,
      removeWorkspaceTask,
      setWorkspaceTaskError,
      task,
      upsertWorkspaceTask,
      workspaceId: "workspace-1",
    });

    expect(deleteResult).toBe(false);
    expect(removeWorkspaceTask).toHaveBeenCalledWith("workspace-1", "task-1");
    expect(upsertWorkspaceTask).toHaveBeenCalledWith("workspace-1", task);
    expect(setWorkspaceTaskError).toHaveBeenCalledWith(
      "Failed to delete task."
    );
  });
});
