import type { WorkspaceTask } from "@/lib/tasks";

export function getDashboardDisplayTasks(input: {
  completedTasksAtTop: boolean;
  now?: Date;
  tasks: WorkspaceTask[];
  workspaceId: string;
}) {
  const startOfToday = new Date(input.now ?? new Date());
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(input.now ?? new Date());
  endOfToday.setHours(23, 59, 59, 999);
  const completionRank = (status: WorkspaceTask["status"]) =>
    status === "completed"
      ? input.completedTasksAtTop
        ? 0
        : 1
      : input.completedTasksAtTop
        ? 1
        : 0;

  return input.tasks
    .filter((task) => {
      if (task.workspaceId !== input.workspaceId) {
        return false;
      }

      if (!task.dueAt) {
        return false;
      }

      const due = new Date(task.dueAt);
      return due >= startOfToday && due <= endOfToday;
    })
    .sort((left, right) => {
      const completionDiff =
        completionRank(left.status) - completionRank(right.status);
      if (completionDiff !== 0) {
        return completionDiff;
      }
      if (left.dueAt && right.dueAt) {
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
      }
      if (left.dueAt) {
        return -1;
      }
      if (right.dueAt) {
        return 1;
      }
      return 0;
    });
}

export function getDashboardTaskManagerState(input: {
  loadFailed: boolean;
  loading: boolean;
  visibleTaskCount: number;
}) {
  if (input.loading) {
    return {
      description: null,
      showSpinner: true,
      title: "Loading tasks...",
    };
  }

  if (input.loadFailed && input.visibleTaskCount === 0) {
    return {
      description: "Try again in a moment or refresh the workspace.",
      showSpinner: false,
      title: "Unable to load tasks.",
    };
  }

  if (input.visibleTaskCount === 0) {
    return {
      description:
        "Capture a task with a due date of today and it will show up here with quick edit and completion controls.",
      showSpinner: false,
      title: "No tasks due today",
    };
  }

  return null;
}
