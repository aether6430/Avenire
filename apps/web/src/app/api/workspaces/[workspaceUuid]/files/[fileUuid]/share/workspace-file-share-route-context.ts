import { NextResponse } from "next/server";
import { getFileAssetById } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export interface WorkspaceFileShareRouteContext {
  apiLogger: ReturnType<typeof createApiLogger>;
  file: NonNullable<Awaited<ReturnType<typeof getFileAssetById>>>;
  fileUuid: string;
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  workspaceUuid: string;
}

export async function resolveWorkspaceFileShareRouteContext(input: {
  params: Promise<{ fileUuid: string; workspaceUuid: string }>;
  request: Request;
  route: string;
}) {
  const user = await getSessionUser();
  const { fileUuid, workspaceUuid } = await input.params;
  const apiLogger = createApiLogger({
    request: input.request,
    route: input.route,
    feature: "file-sharing",
    userId: user?.id ?? null,
    workspaceId: workspaceUuid,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized", {
      fileUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    void apiLogger.requestFailed(403, "Forbidden", {
      fileUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const file = await getFileAssetById(workspaceUuid, fileUuid);
  if (!file) {
    void apiLogger.requestFailed(404, "File not found", {
      fileUuid,
      workspaceUuid,
    });
    return {
      response: NextResponse.json({ error: "File not found" }, { status: 404 }),
    };
  }

  return {
    apiLogger,
    file,
    fileUuid,
    user,
    workspaceUuid,
  } satisfies WorkspaceFileShareRouteContext;
}
