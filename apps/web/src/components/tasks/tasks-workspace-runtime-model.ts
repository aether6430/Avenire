import {
  createTaskDraft,
  type TaskEditorDraft,
} from "@/components/tasks/types";
import type { WorkspaceTask } from "@/lib/tasks";

export function buildOptimisticTaskStatusUpdate(input: {
  nextStatus: WorkspaceTask["status"];
  nowIso: string;
  task: WorkspaceTask;
}) {
  return {
    ...input.task,
    completedAt: input.nextStatus === "completed" ? input.nowIso : null,
    status: input.nextStatus,
  } satisfies WorkspaceTask;
}

export function resolveTasksWorkspaceCreateState(currentUserId: string) {
  return {
    draft: createTaskDraft(currentUserId),
    mode: "create" as const,
    routeTaskId: null,
    selectedTaskId: null,
    sheetOpen: true,
  };
}

export function resolveTasksWorkspaceEditState(input: {
  currentUserId: string;
  selectedTask: WorkspaceTask | null;
  taskId: string;
}) {
  return {
    draft: createTaskDraft(input.currentUserId, input.selectedTask),
    mode: "edit" as const,
    routeTaskId: input.taskId,
    selectedTaskId: input.taskId,
    sheetOpen: true,
  };
}

export function resolveTasksWorkspaceSaveSuccess(input: {
  currentUserId: string;
  mode: "create" | "edit";
  savedTask: WorkspaceTask;
}) {
  if (input.mode === "create") {
    return {
      draft: null,
      mode: "idle" as const,
      routeTaskId: null,
      selectedTaskId: null,
      sheetOpen: false,
    };
  }

  return {
    draft: createTaskDraft(input.currentUserId, input.savedTask),
    mode: "edit" as const,
    routeTaskId: input.savedTask.id,
    selectedTaskId: input.savedTask.id,
    sheetOpen: true,
  };
}

export function resolveTasksWorkspaceDeleteSuccess() {
  return {
    draft: null,
    mode: "idle" as const,
    routeTaskId: null,
    selectedTaskId: null,
    sheetOpen: false,
  };
}

export function resolveTasksWorkspaceClosedSheetState(input: {
  draft: TaskEditorDraft | null;
  mode: "create" | "edit" | "idle";
}) {
  return {
    draft: input.mode === "create" ? null : input.draft,
    routeTaskId: null,
    sheetOpen: false,
  };
}

export function resolveTasksWorkspaceSearchParamState(taskId: string | null) {
  if (!taskId) {
    return null;
  }

  return {
    mode: "edit" as const,
    selectedTaskId: taskId,
    sheetOpen: true,
  };
}

export function resolveTasksWorkspaceDraftSync(input: {
  currentDraft: TaskEditorDraft | null;
  currentUserId: string;
  isDirty: boolean;
  mode: "create" | "edit" | "idle";
  selectedTask: WorkspaceTask | null;
}) {
  if (input.mode !== "edit" || !input.selectedTask) {
    return input.currentDraft;
  }

  if (input.currentDraft && input.isDirty) {
    return input.currentDraft;
  }

  return createTaskDraft(input.currentUserId, input.selectedTask);
}

export function resolveTasksWorkspaceDropStatus(input: {
  nextStatus: WorkspaceTask["status"];
  task: WorkspaceTask | null;
}) {
  return {
    draggedTaskId: null,
    dropStatus: null,
    shouldMove: Boolean(input.task && input.task.status !== input.nextStatus),
    task: input.task,
  };
}

export function resolveTasksWorkspaceDragEndState() {
  return {
    draggedTaskId: null,
    dropStatus: null,
  };
}
