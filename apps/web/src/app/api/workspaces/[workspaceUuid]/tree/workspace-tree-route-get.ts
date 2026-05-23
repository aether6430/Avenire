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
import {
  buildWorkspaceTreeRoutePayload,
  resolveWorkspaceTreeRouteError,
  WORKSPACE_TREE_LOAD_ERROR,
} from "./workspace-tree-route-model";

export async function handleWorkspaceTreeGet(input: {
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.workspaceTree,
      input.workspaceUuid
    );
    const cacheKey = createRouteCacheKey({
      namespace: CACHE_NAMESPACES.workspaceTree,
      scope: input.workspaceUuid,
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
      listWorkspaceFolders(input.workspaceUuid, input.userId),
      listWorkspaceFiles(input.workspaceUuid, input.userId),
    ]);
    const ingestionFlags = await getIngestionFlagsByFileIds(
      input.workspaceUuid,
      files.map((file) => file.id)
    );
    const payload = buildWorkspaceTreeRoutePayload({
      files,
      folders,
      ingestionFlags,
    });

    await setCachedRoute(CACHE_NAMESPACES.workspaceTree, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-workspace-tree-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTreeRouteError(error, WORKSPACE_TREE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
