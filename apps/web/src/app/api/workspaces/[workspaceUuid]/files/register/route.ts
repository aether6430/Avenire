import { NextResponse } from "next/server";
import {
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
} from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";
import {
  isWorkspaceFileRegisterNotePayload,
  type WorkspaceFileRegisterBody,
} from "./workspace-file-register-model";
import { registerWorkspaceNoteFromContent } from "./workspace-file-register-note";
import { registerWorkspaceStoredUpload } from "./workspace-file-register-upload";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  const apiLogger = createApiLogger({
    request,
    route: "/api/workspaces/[workspaceUuid]/files/register",
    feature: "files",
    userId: user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;

  const body = (await request
    .json()
    .catch(() => ({}))) as WorkspaceFileRegisterBody;

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

  return await registerWorkspaceStoredUpload({
    apiLogger,
    body,
    userId: user.id,
    workspaceUuid,
  });
}
