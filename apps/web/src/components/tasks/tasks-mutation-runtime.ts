import { buildOptimisticTaskStatusUpdate } from "@/components/tasks/tasks-workspace-runtime-model";
import type { WorkspaceTask } from "@/lib/tasks";

export async function updateWorkspaceTaskStatusWithRollback(input: {
  nextStatus: WorkspaceTask["status"];
  onCompleted?: (() => void) | null;
  patchWorkspaceTask: (
    workspaceId: string,
    taskId: string,
    updater: (task: WorkspaceTask) => WorkspaceTask
  ) => void;
  persistTaskStatus: (input: {
    status: WorkspaceTask["status"];
    taskId: string;
  }) => Promise<WorkspaceTask>;
  reloadWorkspaceTasks: (
    workspaceId: string,
    options?: { background?: boolean }
  ) => Promise<void> | void;
  setWorkspaceTaskError: (errorMessage: string | null) => void;
  task: WorkspaceTask;
  upsertWorkspaceTask: (workspaceId: string, task: WorkspaceTask) => void;
  workspaceId: string;
}) {
  const previousTask = input.task;
  const optimisticNowIso = new Date().toISOString();

  input.patchWorkspaceTask(input.workspaceId, input.task.id, (current) =>
    buildOptimisticTaskStatusUpdate({
      nextStatus: input.nextStatus,
      nowIso: optimisticNowIso,
      task: current,
    })
  );

  try {
    const updatedTask = await input.persistTaskStatus({
      status: input.nextStatus,
      taskId: input.task.id,
    });
    input.upsertWorkspaceTask(input.workspaceId, updatedTask);
    if (
      previousTask.status !== "completed" &&
      updatedTask.status === "completed"
    ) {
      input.onCompleted?.();
    }
    void input.reloadWorkspaceTasks(input.workspaceId, { background: true });
    return updatedTask;
  } catch (error) {
    input.upsertWorkspaceTask(input.workspaceId, previousTask);
    input.setWorkspaceTaskError(
      error instanceof Error ? error.message : "Unable to update task."
    );
    return null;
  }
}

export async function deleteWorkspaceTaskWithRollback(input: {
  deleteTaskRecord: (taskId: string) => Promise<void>;
  reloadWorkspaceTasks: (
    workspaceId: string,
    options?: { background?: boolean }
  ) => Promise<void> | void;
  removeWorkspaceTask: (workspaceId: string, taskId: string) => void;
  setWorkspaceTaskError: (errorMessage: string | null) => void;
  task: WorkspaceTask;
  upsertWorkspaceTask: (workspaceId: string, task: WorkspaceTask) => void;
  workspaceId: string;
}) {
  input.removeWorkspaceTask(input.workspaceId, input.task.id);

  try {
    await input.deleteTaskRecord(input.task.id);
    void input.reloadWorkspaceTasks(input.workspaceId, { background: true });
    return true;
  } catch (error) {
    input.upsertWorkspaceTask(input.workspaceId, input.task);
    input.setWorkspaceTaskError(
      error instanceof Error ? error.message : "Unable to delete task."
    );
    return false;
  }
}
