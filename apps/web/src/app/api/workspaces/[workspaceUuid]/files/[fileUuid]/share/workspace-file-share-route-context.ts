import { NextResponse } from "next/server";
import { getFileAssetById } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceFileShareRouteError,
  WORKSPACE_FILE_SHARE_CONTEXT_ERROR,
} from "./workspace-file-share-route-model";

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
  let fileUuid = "";
  let workspaceUuid = "";
  let apiLogger: ReturnType<typeof createApiLogger> | null = null;

  try {
    ({ fileUuid, workspaceUuid } = await input.params);
    const user = await getSessionUser();
    apiLogger = createApiLogger({
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

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
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
        response: NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        ),
      };
    }

    return {
      apiLogger,
      file,
      fileUuid,
      user,
      workspaceUuid,
    } satisfies WorkspaceFileShareRouteContext;
  } catch (error) {
    void apiLogger?.requestFailed(500, error, {
      fileUuid: fileUuid || null,
      workspaceUuid: workspaceUuid || null,
    });
    return {
      response: NextResponse.json(
        {
          error: resolveWorkspaceFileShareRouteError(
            error,
            WORKSPACE_FILE_SHARE_CONTEXT_ERROR
          ),
        },
        { status: 500 }
      ),
    };
  }
}
