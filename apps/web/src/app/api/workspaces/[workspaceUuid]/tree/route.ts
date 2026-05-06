import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { listWorkspaceFiles, listWorkspaceFolders } from "@/lib/file-data";
import { getIngestionFlagsByFileIds } from "@/lib/ingestion-data";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.workspaceTree,
    workspaceUuid
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.workspaceTree,
    scope: workspaceUuid,
    version,
  });
  const cached = await getCachedRoute<{
    files: unknown[];
    folders: unknown[];
  }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-workspace-tree-cache": "hit" },
    });
  }

  const [folders, files] = await Promise.all([
    listWorkspaceFolders(workspaceUuid, user.id),
    listWorkspaceFiles(workspaceUuid, user.id),
  ]);
  const ingestionFlags = await getIngestionFlagsByFileIds(
    workspaceUuid,
    files.map((file) => file.id)
  );
  const payload = {
    folders,
    files: files.map((file) => ({
      ...file,
      isIngested: ingestionFlags[file.id] ?? false,
    })),
  };

  await setCachedRoute(CACHE_NAMESPACES.workspaceTree, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-workspace-tree-cache": "miss" },
  });
}
