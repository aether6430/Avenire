import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  createFolder,
  isSharedFilesVirtualFolderId,
  userCanAccessWorkspace,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  buildWorkspaceFolderCreateResponse,
  normalizeWorkspaceFoldersRouteWorkspaceId,
  parseWorkspaceFolderCreatePayload,
  resolveWorkspaceFolderCreateRouteError,
  WORKSPACE_FOLDER_CREATE_ERROR,
} from "./workspace-folders-route-model";

export async function handleWorkspaceFoldersPost(input: {
  request: Request;
  userId: string;
  workspaceUuid: string;
}) {
  const workspaceUuid = normalizeWorkspaceFoldersRouteWorkspaceId(
    input.workspaceUuid
  );
  try {
    const payload = await input.request.json().catch(() => ({}));
    const parsed = parseWorkspaceFolderCreatePayload(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (
      parsed.data.parentId &&
      isSharedFilesVirtualFolderId(parsed.data.parentId, workspaceUuid)
    ) {
      return NextResponse.json(
        { error: "Cannot create items in Shared Files" },
        { status: 400 }
      );
    }

    const canEdit = parsed.data.parentId
      ? await userCanEditFolder({
          workspaceId: workspaceUuid,
          folderId: parsed.data.parentId,
          userId: input.userId,
        })
      : await userCanAccessWorkspace(input.userId, workspaceUuid);

    if (!canEdit) {
      return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
    }

    const folder = await createFolder(
      workspaceUuid,
      parsed.data.parentId,
      parsed.data.name,
      input.userId
    );
    if (!folder) {
      return NextResponse.json(
        { error: "Unable to create folder" },
        { status: 400 }
      );
    }

    await publishFilesInvalidationEvent({
      workspaceUuid,
      folderId: parsed.data.parentId ?? undefined,
      reason: "folder.created",
    });
    await publishFilesInvalidationEvent({
      workspaceUuid,
      reason: "tree.changed",
    });
    await invalidateWorkspaceReadCaches(workspaceUuid);

    return NextResponse.json(buildWorkspaceFolderCreateResponse({ folder }), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderCreateRouteError(
          error,
          WORKSPACE_FOLDER_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
