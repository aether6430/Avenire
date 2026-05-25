import { NextResponse } from "next/server";
import { getFolderWithAncestors } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceFolderShareRouteError,
  WORKSPACE_FOLDER_SHARE_CONTEXT_ERROR,
} from "./workspace-folder-share-route-model";

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
  let folderUuid = "";
  let workspaceUuid = "";
  let apiLogger: ReturnType<typeof createApiLogger> | null = null;

  try {
    ({ folderUuid, workspaceUuid } = await input.params);
    const user = await getSessionUser();
    apiLogger = createApiLogger({
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

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
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
  } catch (error) {
    void apiLogger?.requestFailed(500, error, {
      folderUuid: folderUuid || null,
      workspaceUuid: workspaceUuid || null,
    });
    return {
      response: NextResponse.json(
        {
          error: resolveWorkspaceFolderShareRouteError(
            error,
            WORKSPACE_FOLDER_SHARE_CONTEXT_ERROR
          ),
        },
        { status: 500 }
      ),
    };
  }
}
