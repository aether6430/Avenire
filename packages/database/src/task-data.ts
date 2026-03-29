import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { member, user } from "./auth-schema";
import { db } from "./client";
import { task, workspace } from "./schema";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "normal" | "high";

export interface TaskAssignee {
  avatar: string | null;
  email: string;
  name: string | null;
  userId: string;
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
};

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
    status: row.status as TaskStatus,
    priority: (row.priority as TaskPriority) ?? null,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
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
  const [row] = await db
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

  return row
    ? {
        avatar: row.avatar,
        email: row.email,
        name: row.name,
        userId: row.userId,
      }
    : null;
}

export async function listTasksForUser(
  userId: string,
  workspaceId?: string | null,
  options?: {
    assigneeUserId?: string;
    status?: TaskStatus;
    includeCompleted?: boolean;
    dueBefore?: Date;
    limit?: number;
  }
): Promise<TaskRecord[]> {
  const conditions = [eq(task.userId, userId)];

  if (workspaceId) {
    conditions.push(eq(task.workspaceId, workspaceId));
  }
  if (options?.assigneeUserId) {
    conditions.push(eq(task.assigneeUserId, options.assigneeUserId));
  }

  if (options?.status) {
    conditions.push(eq(task.status, options.status));
  } else if (!options?.includeCompleted) {
    const pendingOrInProgress = or(
      eq(task.status, "pending"),
      eq(task.status, "in_progress")
    );
    if (pendingOrInProgress) {
      conditions.push(pendingOrInProgress);
    }
  }

  if (options?.dueBefore) {
    const dueOrNull = or(
      isNull(task.dueAt),
      lte(task.dueAt, options.dueBefore)
    );
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
  userId: string,
  workspaceId?: string | null
): Promise<TaskRecord[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const rows = await db
    .select(buildTaskSelection())
    .from(task)
    .leftJoin(user, eq(user.id, task.assigneeUserId))
    .where(
      and(
        eq(task.userId, userId),
        workspaceId ? eq(task.workspaceId, workspaceId) : undefined,
        or(eq(task.status, "pending"), eq(task.status, "in_progress")),
        or(isNull(task.dueAt), lte(task.dueAt, today))
      )
    )
    .orderBy(asc(task.dueAt), desc(task.priority), asc(task.createdAt));

  return rows.map(mapTask);
}

export async function getTaskForUser(
  userId: string,
  taskId: string
): Promise<TaskRecord | null> {
  const [row] = await db
    .select(buildTaskSelection())
    .from(task)
    .leftJoin(user, eq(user.id, task.assigneeUserId))
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
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
  }
): Promise<TaskRecord> {
  const now = new Date();
  const assigneeUserId = data.assigneeUserId ?? userId;
  const assignee = await resolveAssignableUser(workspaceId, assigneeUserId);
  if (!assignee) {
    throw new Error("Assignee must belong to the current workspace.");
  }

  const [row] = await db
    .insert(task)
    .values({
      id: randomUUID(),
      workspaceId,
      userId,
      assigneeUserId: assignee.userId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "pending",
      priority: data.priority ?? "normal",
      dueAt: data.dueAt ?? null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return getTaskForUser(userId, row.id).then((taskRecord) => {
    if (!taskRecord) {
      throw new Error("Task was created but could not be loaded.");
    }
    return taskRecord;
  });
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  updates: {
    assigneeUserId?: string | null;
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: Date | null;
  }
): Promise<TaskRecord | null> {
  const existingTask = await db
    .select({ workspaceId: task.workspaceId })
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
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
    const nextAssigneeUserId = updates.assigneeUserId ?? userId;
    const assignee = await resolveAssignableUser(
      currentTask.workspaceId,
      nextAssigneeUserId
    );
    if (!assignee) {
      throw new Error("Assignee must belong to the current workspace.");
    }
    updateData.assigneeUserId = assignee.userId;
  }

  const [row] = await db
    .update(task)
    .set(updateData)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
    .returning();

  return row ? getTaskForUser(userId, row.id) : null;
}

export async function deleteTaskForUser(
  userId: string,
  taskId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(task)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
    .returning();

  return Boolean(deleted);
}

export async function countPendingTasksForUser(
  userId: string,
  workspaceId?: string | null
): Promise<number> {
  const rows = await db
    .select({ id: task.id })
    .from(task)
    .where(
      and(
        eq(task.userId, userId),
        workspaceId ? eq(task.workspaceId, workspaceId) : undefined,
        or(eq(task.status, "pending"), eq(task.status, "in_progress"))
      )
    );

  return rows.length;
}
