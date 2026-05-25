import type {
  TaskPriority,
  TaskResourceLink,
  TaskStatus,
} from "@avenire/database/task-data";

export interface TaskRouteBody {
  assigneeUserId?: string | null;
  description?: string | null;
  dueAt?: string | null;
  priority?: TaskPriority;
  resources?: TaskResourceLink[];
  status?: TaskStatus;
  title?: string;
}

export const TASK_LIST_LOAD_ERROR = "Unable to load tasks.";
export const TASK_CREATE_ERROR = "Unable to create task.";
export const TASK_LOAD_ERROR = "Unable to load task.";
export const TASK_UPDATE_ERROR = "Unable to update task.";
export const TASK_DELETE_ERROR = "Unable to delete task.";

function isTaskStatus(value: string | null): value is TaskStatus {
  return (
    value === "planned" ||
    value === "drafting" ||
    value === "polishing" ||
    value === "completed"
  );
}

function parseOptionalLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveTasksRouteListQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const normalizedStatus = isTaskStatus(status) ? status : undefined;

  return {
    assigneeUserId: searchParams.get("assigneeUserId") ?? undefined,
    dueBefore: searchParams.get("dueBefore") ?? undefined,
    includeCompleted:
      searchParams.get("includeCompleted") === "true" ||
      normalizedStatus === "completed",
    limit: parseOptionalLimit(searchParams.get("limit")),
    status: normalizedStatus,
  };
}

export function resolveTaskCreatePayload(input: {
  body: TaskRouteBody;
  fallbackAssigneeUserId: string;
}) {
  return {
    assigneeUserId: input.body.assigneeUserId ?? input.fallbackAssigneeUserId,
    description: input.body.description ?? null,
    dueAt: input.body.dueAt ? new Date(input.body.dueAt) : null,
    priority: input.body.priority ?? "normal",
    resources: input.body.resources ?? [],
    status: input.body.status ?? "planned",
    title: input.body.title?.trim() ?? "",
  };
}

export function resolveTaskUpdatePayload(body: TaskRouteBody) {
  let dueAt: Date | null | undefined;
  if (body.dueAt) {
    dueAt = new Date(body.dueAt);
  } else if (body.dueAt === null) {
    dueAt = null;
  } else {
    dueAt = undefined;
  }

  return {
    assigneeUserId: body.assigneeUserId,
    description: body.description,
    dueAt,
    priority: body.priority,
    resources: body.resources,
    status: body.status,
    title: body.title,
  };
}

export function resolveTaskRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
