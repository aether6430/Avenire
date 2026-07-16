import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import {
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
} from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";
import {
  isWorkspaceFileRegisterNotePayload,
  resolveWorkspaceFileRegisterRouteError,
  WORKSPACE_FILE_REGISTER_ERROR,
  WorkspaceFileRegisterRequest,
} from "./workspace-file-register-model";
import { registerWorkspaceNoteFromContent } from "./workspace-file-register-note";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const apiLogger = createApiLogger({
    request,
    route: "/api/workspaces/[workspaceUuid]/files/register",
    feature: "files",
    userId: null,
  });
  void apiLogger.requestStarted();

  try {
    const user = await getSessionUser();
    if (!user) {
      void apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;

    const parsed = await parseJsonRequest(
      request,
      WorkspaceFileRegisterRequest
    );
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Missing file metadata", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Missing file metadata" },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (!body.folderId) {
      void apiLogger.requestFailed(400, "Missing file metadata", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Missing file metadata" },
        { status: 400 }
      );
    }

    if (isSharedFilesVirtualFolderId(body.folderId, workspaceUuid)) {
      void apiLogger.requestFailed(400, "Cannot create items in Shared Files", {
        workspaceUuid,
      });
      return NextResponse.json(
        { error: "Cannot create items in Shared Files" },
        { status: 400 }
      );
    }
    const canEdit = await userCanEditFolder({
      workspaceId: workspaceUuid,
      folderId: body.folderId,
      userId: user.id,
    });
    if (!canEdit) {
      void apiLogger.requestFailed(403, "Read-only folder", { workspaceUuid });
      return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
    }

    if (isWorkspaceFileRegisterNotePayload(body)) {
      return await registerWorkspaceNoteFromContent({
        apiLogger,
        body,
        userId: user.id,
        workspaceUuid,
      });
    }

    void apiLogger.requestFailed(410, "Upload session required", {
      workspaceUuid,
    });
    return NextResponse.json(
      { error: "Binary uploads require an upload session" },
      { status: 410 }
    );
  } catch (error) {
    void apiLogger.requestFailed(500, error);
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRegisterRouteError(
          error,
          WORKSPACE_FILE_REGISTER_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
