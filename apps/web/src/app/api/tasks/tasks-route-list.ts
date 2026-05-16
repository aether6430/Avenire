import { listTasksForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import {
  createTaskListCacheKey,
  getCachedTaskList,
  getTaskListCacheVersion,
  setCachedTaskList,
} from "@/lib/tasks-cache";
import { resolveTasksRouteListQuery } from "./tasks-route-model";

export async function handleTasksRouteGet(input: {
  request: Request;
  workspaceId: string;
}) {
  const query = resolveTasksRouteListQuery(input.request);
  const version = await getTaskListCacheVersion(input.workspaceId);
  const cacheKey = createTaskListCacheKey({
    assigneeUserId: query.assigneeUserId,
    dueBefore: query.dueBefore,
    includeCompleted: query.includeCompleted,
    limit: query.limit,
    status: query.status,
    version,
    workspaceUuid: input.workspaceId,
  });
  const cached = await getCachedTaskList<{ tasks: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-tasks-cache": "hit" },
    });
  }

  const tasks = await listTasksForUser(input.workspaceId, {
    assigneeUserId: query.assigneeUserId,
    dueBefore: query.dueBefore ? new Date(query.dueBefore) : undefined,
    includeCompleted: query.includeCompleted,
    limit: query.limit,
    status: query.status,
  });

  await setCachedTaskList(cacheKey, { tasks });

  return NextResponse.json({ tasks }, { headers: { "x-tasks-cache": "miss" } });
}
