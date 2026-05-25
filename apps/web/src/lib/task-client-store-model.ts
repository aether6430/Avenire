import type { WorkspaceTask } from "@/lib/tasks";

export interface TaskStoreSnapshot {
  errorMessage: string | null;
  loadFailed: boolean;
  loading: boolean;
  tasks: WorkspaceTask[];
  workspaceUuid: string | null;
}

export const DEFAULT_TASK_STORE_SNAPSHOT: TaskStoreSnapshot = {
  errorMessage: null,
  loadFailed: false,
  loading: false,
  tasks: [],
  workspaceUuid: null,
};

interface TaskStoreSortOptions {
  completedTasksAtTop: boolean;
}

function getTaskStatusRank(
  status: WorkspaceTask["status"],
  completedTasksAtTop: boolean
) {
  switch (status) {
    case "completed":
      return completedTasksAtTop ? 0 : 3;
    case "planned":
      return completedTasksAtTop ? 1 : 0;
    case "drafting":
      return completedTasksAtTop ? 2 : 1;
    case "polishing":
      return completedTasksAtTop ? 3 : 2;
    default:
      return 4;
  }
}

function getTaskPriorityRank(priority: WorkspaceTask["priority"]) {
  switch (priority) {
    case "high":
      return 2;
    case "normal":
      return 1;
    default:
      return 0;
  }
}

export function sortWorkspaceTasksWithPreferences(
  tasks: WorkspaceTask[],
  options: TaskStoreSortOptions
) {
  return tasks.slice().sort((left, right) => {
    const leftStatus = getTaskStatusRank(
      left.status,
      options.completedTasksAtTop
    );
    const rightStatus = getTaskStatusRank(
      right.status,
      options.completedTasksAtTop
    );
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const leftDue = left.dueAt
      ? new Date(left.dueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt
      ? new Date(right.dueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    const priorityDiff =
      getTaskPriorityRank(right.priority) - getTaskPriorityRank(left.priority);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

export function createPrimedTaskStoreSnapshot(input: {
  cachedTasks: WorkspaceTask[] | null;
  completedTasksAtTop: boolean;
  workspaceUuid: string;
}): TaskStoreSnapshot {
  return {
    errorMessage: null,
    loadFailed: false,
    loading: input.cachedTasks === null,
    tasks: input.cachedTasks
      ? sortWorkspaceTasksWithPreferences(input.cachedTasks, {
          completedTasksAtTop: input.completedTasksAtTop,
        })
      : [],
    workspaceUuid: input.workspaceUuid,
  };
}

export function applyTaskStoreLoading(current: TaskStoreSnapshot) {
  return {
    ...current,
    loadFailed: false,
    loading: true,
  } satisfies TaskStoreSnapshot;
}

export function applyTaskStoreError(
  current: TaskStoreSnapshot,
  errorMessage: string | null
) {
  return {
    ...current,
    errorMessage,
    loadFailed: true,
    loading: false,
  } satisfies TaskStoreSnapshot;
}

export function applyTaskStoreErrorMessage(
  current: TaskStoreSnapshot,
  errorMessage: string | null
) {
  return {
    ...current,
    errorMessage,
  } satisfies TaskStoreSnapshot;
}

export function applyPatchedTaskToSnapshot(input: {
  completedTasksAtTop: boolean;
  current: TaskStoreSnapshot;
  taskId: string;
  updater: (task: WorkspaceTask) => WorkspaceTask;
  workspaceUuid: string;
}) {
  if (input.current.workspaceUuid !== input.workspaceUuid) {
    return input.current;
  }

  return {
    ...input.current,
    tasks: sortWorkspaceTasksWithPreferences(
      input.current.tasks.map((task) =>
        task.id === input.taskId ? input.updater(task) : task
      ),
      { completedTasksAtTop: input.completedTasksAtTop }
    ),
  } satisfies TaskStoreSnapshot;
}

export function applyUpsertedTaskToSnapshot(input: {
  completedTasksAtTop: boolean;
  current: TaskStoreSnapshot;
  task: WorkspaceTask;
  workspaceUuid: string;
}) {
  if (input.current.workspaceUuid !== input.workspaceUuid) {
    return {
      errorMessage: null,
      loadFailed: false,
      loading: false,
      tasks: sortWorkspaceTasksWithPreferences([input.task], {
        completedTasksAtTop: input.completedTasksAtTop,
      }),
      workspaceUuid: input.workspaceUuid,
    } satisfies TaskStoreSnapshot;
  }

  return {
    ...input.current,
    tasks: sortWorkspaceTasksWithPreferences(
      input.current.tasks
        .filter((entry) => entry.id !== input.task.id)
        .concat(input.task),
      { completedTasksAtTop: input.completedTasksAtTop }
    ),
  } satisfies TaskStoreSnapshot;
}

export function applyRemovedTaskFromSnapshot(input: {
  current: TaskStoreSnapshot;
  taskId: string;
  workspaceUuid: string;
}) {
  if (input.current.workspaceUuid !== input.workspaceUuid) {
    return input.current;
  }

  return {
    ...input.current,
    tasks: input.current.tasks.filter((task) => task.id !== input.taskId),
  } satisfies TaskStoreSnapshot;
}

export function toTaskStoreErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not load tasks right now.";
}
