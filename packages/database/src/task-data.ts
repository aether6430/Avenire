import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "./client";
import { task } from "./schema";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "normal" | "high";

export interface TaskRecord {
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

type TaskRow = typeof task.$inferSelect;

const mapTask = (row: TaskRow): TaskRecord => ({
  id: row.id,
  workspaceId: row.workspaceId,
  userId: row.userId,
  title: row.title,
  description: row.description ?? null,
  status: row.status as TaskStatus,
  priority: (row.priority as TaskPriority) ?? null,
  dueAt: row.dueAt?.toISOString() ?? null,
  completedAt: row.completedAt?.toISOString() ?? null,
  createdBy: row.createdBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export async function listTasksForUser(
  userId: string,
  workspaceId?: string | null,
  options?: {
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
    .select()
    .from(task)
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
    .select()
    .from(task)
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
    .select()
    .from(task)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
    .limit(1);

  return row ? mapTask(row) : null;
}

export async function createTaskForUser(
  userId: string,
  workspaceId: string,
  data: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: Date | null;
  }
): Promise<TaskRecord> {
  const now = new Date();
  const [row] = await db
    .insert(task)
    .values({
      id: randomUUID(),
      workspaceId,
      userId,
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

  return mapTask(row);
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueAt?: Date | null;
  }
): Promise<TaskRecord | null> {
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
    }
  }
  if (updates.priority !== undefined) {
    updateData.priority = updates.priority;
  }
  if (updates.dueAt !== undefined) {
    updateData.dueAt = updates.dueAt;
  }

  const [row] = await db
    .update(task)
    .set(updateData)
    .where(and(eq(task.id, taskId), eq(task.userId, userId)))
    .returning();

  return row ? mapTask(row) : null;
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
