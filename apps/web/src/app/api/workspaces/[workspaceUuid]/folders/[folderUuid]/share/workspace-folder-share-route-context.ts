import { NextResponse } from "next/server";
import { getFolderWithAncestors } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export interface WorkspaceFolderShareRouteContext {
  apiLogger: ReturnType<typeof createApiLogger>;
  folder: NonNullable<Awaited<ReturnType<typeof getFolderWithAncestors>>>;
  folderUuid: string;
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  workspaceUuid: string;
}

export async function resolveWorkspaceFolderShareRouteContext(input: {
  params: Promise<{ folderUuid: string; workspaceUuid: string }>;
  request: Request;
  route: string;
}) {
  const user = await getSessionUser();
  const { folderUuid, workspaceUuid } = await input.params;
  const apiLogger = createApiLogger({
    request: input.request,
    route: input.route,
    feature: "folder-sharing",
    userId: user?.id ?? null,
    workspaceId: workspaceUuid,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized", {
      folderUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    void apiLogger.requestFailed(403, "Forbidden", {
      folderUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const folder = await getFolderWithAncestors(
    workspaceUuid,
    folderUuid,
    user.id
  );
  if (!folder?.folder) {
    void apiLogger.requestFailed(404, "Folder not found", {
      folderUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      ),
    };
  }

  return {
    apiLogger,
    folder,
    folderUuid,
    user,
    workspaceUuid,
  } satisfies WorkspaceFolderShareRouteContext;
}
