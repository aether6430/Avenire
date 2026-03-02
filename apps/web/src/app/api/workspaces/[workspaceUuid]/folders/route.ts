import { createFolder, isSharedFilesVirtualFolderId } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> },
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

  const body = (await request.json().catch(() => ({}))) as {
    parentId?: string;
    name?: string;
  };

  if (!body.parentId || !body.name) {
    return NextResponse.json({ error: "Missing parentId or name" }, { status: 400 });
  }
  if (isSharedFilesVirtualFolderId(body.parentId, workspaceUuid)) {
    return NextResponse.json({ error: "Cannot create items in Shared Files" }, { status: 400 });
  }

  const folder = await createFolder(workspaceUuid, body.parentId, body.name, user.id);
  if (!folder) {
    return NextResponse.json({ error: "Unable to create folder" }, { status: 400 });
  }

  await publishFilesInvalidationEvent({
    workspaceUuid,
    folderId: body.parentId,
    reason: "folder.created",
  });
  await publishFilesInvalidationEvent({
    workspaceUuid,
    reason: "tree.changed",
  });

  return NextResponse.json({ folder }, { status: 201 });
}
