import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { member, user } from "./auth-schema";
import { db } from "./client";
import { listChatsForUser } from "./chat-data";
import { listWorkspaceFiles, listWorkspaceFolders } from "./file-data";
import { task, workspace } from "./schema";

export type TaskStatus = "planned" | "drafting" | "polishing" | "completed";
export type TaskPriority = "low" | "normal" | "high";
export type TaskResourceType = "file" | "folder" | "chat";

export interface TaskAssignee {
  avatar: string | null;
  email: string;
  name: string | null;
  userId: string;
}

export interface TaskResourceLink extends Record<string, unknown> {
  href: string;
  resourceId: string;
  resourceType: TaskResourceType;
  subtitle: string | null;
  title: string;
}

export interface TaskRecord {
  assignee: TaskAssignee | null;
  assigneeUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
  description: string | null;
  dueAt: string | null;
  id: string;
  priority: TaskPriority | null;
  resources: TaskResourceLink[];
  status: TaskStatus;
  title: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
}

type TaskRow = typeof task.$inferSelect & {
  assigneeAvatar: string | null;
  assigneeEmail: string | null;
  assigneeName: string | null;
  resources: unknown;
};

function normalizeTaskStatus(status: string | null): TaskStatus {
  switch (status) {
    case "drafting":
    case "polishing":
    case "completed":
    case "planned":
      return status;
    case "in_progress":
      return "drafting";
    default:
      return "planned";
  }
}

function normalizeTaskResources(resources: unknown): TaskResourceLink[] {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources.filter((resource): resource is TaskResourceLink => {
    if (!(resource && typeof resource === "object" && !Array.isArray(resource))) {
      return false;
    }

    const record = resource as Record<string, unknown>;
    return (
      (record.resourceType === "file" ||
        record.resourceType === "folder" ||
        record.resourceType === "chat") &&
      typeof record.resourceId === "string" &&
      typeof record.title === "string" &&
      typeof record.href === "string"
    );
  });
}

const mapTask = (row: TaskRow): TaskRecord => {
  const assignee =
    row.assigneeUserId && row.assigneeEmail
      ? {
          avatar: row.assigneeAvatar,
          email: row.assigneeEmail,
          name: row.assigneeName,
          userId: row.assigneeUserId,
        }
      : null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    assignee,
    assigneeUserId: row.assigneeUserId ?? null,
    title: row.title,
    description: row.description ?? null,
    status: normalizeTaskStatus(row.status),
    priority: (row.priority as TaskPriority) ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    resources: normalizeTaskResources(row.resources),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

function buildTaskSelection() {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    userId: task.userId,
    assigneeUserId: task.assigneeUserId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    resources: task.resources,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assigneeName: user.name,
    assigneeEmail: user.email,
    assigneeAvatar: user.image,
  };
}

async function resolveAssignableUser(
  workspaceId: string,
  assigneeUserId: string
): Promise<TaskAssignee | null> {
  const [workspaceMember] = await db
    .select({
      avatar: user.image,
      email: user.email,
      name: user.name,
      userId: user.id,
    })
    .from(workspace)
    .innerJoin(member, eq(member.organizationId, workspace.organizationId))
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(workspace.id, workspaceId), eq(member.userId, assigneeUserId)))
    .limit(1);

  if (workspaceMember) {
    return {
      avatar: workspaceMember.avatar,
      email: workspaceMember.email,
      name: workspaceMember.name,
      userId: workspaceMember.userId,
    };
  }

  const [directUser] = await db
    .select({
      avatar: user.image,
      email: user.email,
      name: user.name,
      userId: user.id,
    })
    .from(user)
    .where(eq(user.id, assigneeUserId))
    .limit(1);

  return directUser
    ? {
        avatar: directUser.avatar,
        email: directUser.email,
        name: directUser.name,
        userId: directUser.userId,
      }
    : null;
}

async function resolveTaskResources(input: {
  resources?: TaskResourceLink[] | null;
  userId: string;
  workspaceId: string;
}): Promise<TaskResourceLink[]> {
  if (!input.resources || input.resources.length === 0) {
    return [];
  }

  const [files, folders, chats] = await Promise.all([
    listWorkspaceFiles(input.workspaceId, input.userId),
    listWorkspaceFolders(input.workspaceId, input.userId),
    listChatsForUser(input.userId, input.workspaceId),
  ]);

  const fileMap = new Map(
    files.map((file) => [
      `file:${file.id}`,
      {
        href: `/workspace/files/${input.workspaceId}/folder/${file.folderId}?file=${file.id}`,
        resourceId: file.id,
        resourceType: "file" as const,
        subtitle: null,
        title: file.name,
      },
    ])
  );

  const folderMap = new Map(
    folders.map((folder) => [
      `folder:${folder.id}`,
      {
        href: `/workspace/files/${input.workspaceId}/folder/${folder.id}`,
        resourceId: folder.id,
        resourceType: "folder" as const,
        subtitle: "Folder",
        title: folder.name,
      },
    ])
  );

  const chatMap = new Map(
    chats.map((chat) => [
      `chat:${chat.slug}`,
      {
        href: `/workspace/chats/${chat.slug}`,
        resourceId: chat.slug,
        resourceType: "chat" as const,
        subtitle: "Method",
        title: chat.title,
      },
    ])
  );

  const resolved: TaskResourceLink[] = [];
  for (const resource of input.resources) {
    const key = `${resource.resourceType}:${resource.resourceId}`;
    const match = fileMap.get(key) ?? folderMap.get(key) ?? chatMap.get(key);
    if (match) {
      resolved.push(match);
    }
  }

  return resolved;
}

export async function listTasksForUser(
  workspaceId: string,
  options?: {
    assigneeUserId?: string;
    status?: TaskStatus;
    includeCompleted?: boolean;
    dueBefore?: Date;
    limit?: number;
  }
): Promise<TaskRecord[]> {
  const conditions = [eq(task.workspaceId, workspaceId)];

  if (options?.assigneeUserId) {
    conditions.push(eq(task.assigneeUserId, options.assigneeUserId));
  }

  if (options?.status) {
    conditions.push(eq(task.status, options.status));
  } else if (!options?.includeCompleted) {
    const activeStatuses = or(
      eq(task.status, "planned"),
      eq(task.status, "drafting"),
      eq(task.status, "polishing")
    );
    if (activeStatuses) {
      conditions.push(activeStatuses);
    }
  }

  if (options?.dueBefore) {
    const dueOrNull = or(isNull(task.dueAt), lte(task.dueAt, options.dueBefore));
    if (dueOrNull) {
      conditions.push(dueOrNull);
    }
  }

  const rows = await db
    .select(buildTaskSelection())
    .from(task)
    .leftJoin(user, eq(user.id, task.assigneeUserId))
    .where(and(...conditions))
    .orderBy(asc(task.dueAt), desc(task.priority), asc(task.createdAt))
    .limit(options?.limit ?? 50);

  return rows.map(mapTask);
}

export async function listTasksDueToday(
  workspaceId: string
): Promise<TaskRecord[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const rows = await db
    .select(buildTaskSelection())
    .from(task)
    .leftJoin(user, eq(user.id, task.assigneeUserId))
    .where(
      and(
        eq(task.workspaceId, workspaceId),
        or(
          eq(task.status, "planned"),
          eq(task.status, "drafting"),
          eq(task.status, "polishing")
        ),
        or(isNull(task.dueAt), lte(task.dueAt, today))
      )
    )
    .orderBy(asc(task.dueAt), desc(task.priority), asc(task.createdAt));

  return rows.map(mapTask);
}

export async function getTaskForUser(
  workspaceId: string,
  taskId: string
): Promise<TaskRecord | null> {
  const [row] = await db
    .select(buildTaskSelection())
    .from(task)
    .leftJoin(user, eq(user.id, task.assigneeUserId))
    .where(and(eq(task.id, taskId), eq(task.workspaceId, workspaceId)))
    .limit(1);

  return row ? mapTask(row) : null;
}

export async function createTaskForUser(
  userId: string,
  workspaceId: string,
  data: {
    assigneeUserId?: string | null;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: Date | null;
    resources?: TaskResourceLink[] | null;
  }
): Promise<TaskRecord> {
  const now = new Date();
  const assigneeUserId = data.assigneeUserId ?? userId;
  const assignee = await resolveAssignableUser(workspaceId, assigneeUserId);
  if (!assignee) {
    throw new Error("Assignee must be a valid user.");
  }

  const resolvedResources = await resolveTaskResources({
    resources: data.resources ?? null,
    userId,
    workspaceId,
  });

  const [row] = await db
    .insert(task)
    .values({
      id: randomUUID(),
      workspaceId,
      userId,
      assigneeUserId: assignee.userId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "planned",
      priority: data.priority ?? "normal",
      dueAt: data.dueAt ?? null,
      resources: resolvedResources,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return getTaskForUser(workspaceId, row.id).then((taskRecord) => {
    if (!taskRecord) {
      throw new Error("Task was created but could not be loaded.");
    }
    return taskRecord;
  });
}

export async function updateTaskForUser(
  workspaceId: string,
  taskId: string,
  updates: {
    assigneeUserId?: string | null;
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: Date | null;
    resources?: TaskResourceLink[] | null;
  }
): Promise<TaskRecord | null> {
  const existingTask = await db
    .select({ createdBy: task.createdBy, workspaceId: task.workspaceId })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.workspaceId, workspaceId)))
    .limit(1);

  const currentTask = existingTask[0];
  if (!currentTask) {
    return null;
  }

  const now = new Date();
  const updateData: Partial<typeof task.$inferInsert> = {
    updatedAt: now,
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === "completed") {
      updateData.completedAt = now;
    } else {
      updateData.completedAt = null;
    }
  }
  if (updates.priority !== undefined) {
    updateData.priority = updates.priority;
  }
  if (updates.dueAt !== undefined) {
    updateData.dueAt = updates.dueAt;
  }
  if (updates.assigneeUserId !== undefined) {
    const nextAssigneeUserId = updates.assigneeUserId;
    if (!nextAssigneeUserId) {
      updateData.assigneeUserId = null;
    } else {
      const assignee = await resolveAssignableUser(
        currentTask.workspaceId,
        nextAssigneeUserId
      );
      if (!assignee) {
        throw new Error("Assignee must be a valid user.");
      }
      updateData.assigneeUserId = assignee.userId;
    }
  }
  if (updates.resources !== undefined) {
    updateData.resources = await resolveTaskResources({
      resources: updates.resources ?? null,
      userId: currentTask.createdBy,
      workspaceId: currentTask.workspaceId,
    });
  }

  const [row] = await db
    .update(task)
    .set(updateData)
    .where(and(eq(task.id, taskId), eq(task.workspaceId, workspaceId)))
    .returning();

  return row ? getTaskForUser(workspaceId, row.id) : null;
}

export async function deleteTaskForUser(
  workspaceId: string,
  taskId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(task)
    .where(and(eq(task.id, taskId), eq(task.workspaceId, workspaceId)))
    .returning();

  return Boolean(deleted);
}

export async function countPendingTasksForUser(
  workspaceId: string
): Promise<number> {
  const rows = await db
    .select({ id: task.id })
    .from(task)
    .where(
      and(
        eq(task.workspaceId, workspaceId),
        or(
          eq(task.status, "planned"),
          eq(task.status, "drafting"),
          eq(task.status, "polishing")
        )
      )
    );

  return rows.length;
}
