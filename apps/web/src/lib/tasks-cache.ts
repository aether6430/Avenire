import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  invalidateRouteCache,
  setCachedRoute,
} from "@/lib/route-cache";

const TASKS_LIST_CACHE_NAMESPACE = "tasks:list";

export async function getTaskListCacheVersion(workspaceUuid: string) {
  return getRouteCacheVersion(TASKS_LIST_CACHE_NAMESPACE, workspaceUuid);
}

export async function invalidateTaskListCache(workspaceUuid: string) {
  await invalidateRouteCache(TASKS_LIST_CACHE_NAMESPACE, workspaceUuid);
}

export function createTaskListCacheKey(input: {
  assigneeUserId?: string;
  dueBefore?: string;
  includeCompleted?: boolean;
  limit?: number;
  status?: string;
  version: string;
  workspaceUuid: string;
}) {
  return createRouteCacheKey({
    namespace: TASKS_LIST_CACHE_NAMESPACE,
    params: {
      assigneeUserId: input.assigneeUserId ?? null,
      dueBefore: input.dueBefore ?? null,
      includeCompleted: input.includeCompleted ?? false,
      limit: input.limit ?? null,
      status: input.status ?? null,
    },
    scope: input.workspaceUuid,
    version: input.version,
  });
}

export async function getCachedTaskList<T>(key: string): Promise<T | null> {
  return getCachedRoute<T>(key);
}

export async function setCachedTaskList(key: string, value: unknown) {
  await setCachedRoute(TASKS_LIST_CACHE_NAMESPACE, key, value);
}
