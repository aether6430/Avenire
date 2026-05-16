import type {
  TaskEditorDraft,
  TaskGrouping,
  TaskStatusFilter,
} from "@/components/tasks/types";
import { getTaskGroupLabel, type WorkspaceTask } from "@/lib/tasks";

export interface TasksWorkspaceProps {
  currentUserAvatar?: string;
  currentUserEmail?: string;
  currentUserId: string;
  currentUserName?: string;
  workspaceId: string;
}

export interface TaskGroupBucket {
  key: string;
  label: string;
  tasks: WorkspaceTask[];
}

export function getTasksWorkspaceSurfaceState(input: {
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
        "Try a different filter, or create the first task for this workspace.",
      showSpinner: false,
      title: "No tasks match this view",
    };
  }

  return null;
}

export function buildTaskPayload(draft: TaskEditorDraft) {
  return {
    assigneeUserId: draft.assigneeUserId,
    description: draft.description.trim() || null,
    dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
    priority: draft.priority,
    resources: draft.resources,
    status: draft.status,
    title: draft.title.trim(),
  };
}

export function sameTaskDraft(
  left: TaskEditorDraft | null,
  right: TaskEditorDraft | null
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildStatusGroups(tasks: WorkspaceTask[]): TaskGroupBucket[] {
  const buckets: TaskGroupBucket[] = [
    {
      key: "planned",
      label: getTaskGroupLabel("planned"),
      tasks: [],
    },
    {
      key: "drafting",
      label: getTaskGroupLabel("drafting"),
      tasks: [],
    },
    {
      key: "polishing",
      label: getTaskGroupLabel("polishing"),
      tasks: [],
    },
    {
      key: "completed",
      label: getTaskGroupLabel("completed"),
      tasks: [],
    },
  ];

  for (const task of tasks) {
    const bucket =
      buckets.find((entry) => entry.key === task.status) ?? buckets[1];
    bucket?.tasks.push(task);
  }

  return buckets;
}

export function buildDueGroups(tasks: WorkspaceTask[]): TaskGroupBucket[] {
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const buckets: TaskGroupBucket[] = [
    {
      key: "overdue",
      label: getTaskGroupLabel("overdue"),
      tasks: [],
    },
    {
      key: "today",
      label: getTaskGroupLabel("today"),
      tasks: [],
    },
    {
      key: "upcoming",
      label: getTaskGroupLabel("upcoming"),
      tasks: [],
    },
    {
      key: "no_date",
      label: getTaskGroupLabel("no_date"),
      tasks: [],
    },
    {
      key: "completed",
      label: getTaskGroupLabel("completed"),
      tasks: [],
    },
  ];

  for (const task of tasks) {
    if (task.status === "completed") {
      buckets[4]?.tasks.push(task);
      continue;
    }

    if (!task.dueAt) {
      buckets[3]?.tasks.push(task);
      continue;
    }

    const due = new Date(task.dueAt);
    if (due < startOfToday) {
      buckets[0]?.tasks.push(task);
    } else if (due <= endOfToday) {
      buckets[1]?.tasks.push(task);
    } else if (due > now) {
      buckets[2]?.tasks.push(task);
    } else {
      buckets[0]?.tasks.push(task);
    }
  }

  return buckets;
}

export function filterWorkspaceTasks(input: {
  assigneeFilter: string;
  query: string;
  statusFilter: TaskStatusFilter;
  tasks: WorkspaceTask[];
}) {
  const { assigneeFilter, query, statusFilter, tasks } = input;
  const normalizedQuery = query.trim().toLowerCase();

  return tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    if (assigneeFilter !== "all" && task.assigneeUserId !== assigneeFilter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return [
      task.title,
      task.description ?? "",
      task.assignee?.name ?? "",
      task.assignee?.email ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function buildTasksWorkspaceRoute(input: {
  pathname: string;
  searchParams: string;
  taskId: string | null;
}) {
  const nextParams = new URLSearchParams(input.searchParams);

  if (input.taskId) {
    nextParams.set("task", input.taskId);
  } else {
    nextParams.delete("task");
  }

  return nextParams.size > 0
    ? `${input.pathname}?${nextParams.toString()}`
    : input.pathname;
}

export function buildGroupedTasks(input: {
  filteredTasks: WorkspaceTask[];
  grouping: TaskGrouping;
}) {
  return input.grouping === "due"
    ? buildDueGroups(input.filteredTasks)
    : buildStatusGroups(input.filteredTasks);
}
