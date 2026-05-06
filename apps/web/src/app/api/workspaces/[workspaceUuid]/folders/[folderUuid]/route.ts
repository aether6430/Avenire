import { NextResponse } from "next/server";
import {
  CACHE_NAMESPACES,
  invalidateWorkspaceReadCaches,
} from "@/lib/domain-cache";
import {
  getFolderWithAncestors,
  isMarkdownFileRecord,
  isSharedFilesVirtualFolderId,
  listNoteContentByFileIds,
  listFolderContentsForUser,
  listWorkspaceMembers,
  softDeleteFolder,
  updateFolder,
  userCanEditFolder,
  userCanViewFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { getIngestionFlagsByFileIds } from "@/lib/ingestion-data";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { getSessionUser } from "@/lib/workspace";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canView = await userCanViewFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.workspaceFolder,
    workspaceUuid
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.workspaceFolder,
    params: { folderUuid },
    scope: workspaceUuid,
    version,
  });
  const cached = await getCachedRoute<{
    ancestors: unknown[];
    files: unknown[];
    folder: unknown;
    folders: unknown[];
  }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-workspace-folder-cache": "hit" },
    });
  }

  const [folder, children] = await Promise.all([
    getFolderWithAncestors(workspaceUuid, folderUuid, user.id),
    listFolderContentsForUser(workspaceUuid, folderUuid, user.id),
  ]);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const files = children.files ?? [];
  const markdownFiles = files.filter((file) => isMarkdownFileRecord(file));
  const [ingestionFlags, noteRows] = await Promise.all([
    getIngestionFlagsByFileIds(
      workspaceUuid,
      files.map((file) => file.id)
    ),
    listNoteContentByFileIds(markdownFiles.map((file) => file.id)),
  ]);
  const noteContentByFileId = new Map<string, string | null>();
  await Promise.all(
    markdownFiles
      .filter((file) => !noteRows.has(file.id))
      .map(async (file) => {
        const response = await fetch(file.storageUrl, {
          cache: "no-store",
        }).catch(() => null);
        noteContentByFileId.set(
          file.id,
          response?.ok ? await response.text() : null
        );
      })
  );
  for (const [fileId, note] of noteRows) {
    noteContentByFileId.set(fileId, note.content ?? null);
  }
  const payload = {
    folder: folder.folder,
    ancestors: folder.ancestors,
    folders: children.folders,
    files: (children.files ?? []).map((file) => ({
      ...file,
      isIngested: ingestionFlags[file.id] ?? false,
      noteContent: noteContentByFileId.get(file.id) ?? null,
    })),
  };
  await setCachedRoute(CACHE_NAMESPACES.workspaceFolder, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-workspace-folder-cache": "miss" },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canEdit = await userCanEditFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }
  if (isSharedFilesVirtualFolderId(folderUuid, workspaceUuid)) {
    return NextResponse.json(
      { error: "Shared Files is read-only" },
      { status: 400 }
    );
  }
  const members = await listWorkspaceMembers(workspaceUuid);
  const currentMember = members.find((member) => member.userId === user.id);
  if (!(currentMember && ["owner", "admin"].includes(currentMember.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    bannerUrl?: string | null;
    iconColor?: string | null;
    name?: string;
    parentId?: string | null;
  };
  if (
    body.parentId &&
    isSharedFilesVirtualFolderId(body.parentId, workspaceUuid)
  ) {
    return NextResponse.json(
      { error: "Cannot move items into Shared Files" },
      { status: 400 }
    );
  }

  const existing = await getFolderWithAncestors(
    workspaceUuid,
    folderUuid,
    user.id
  );
  if (!existing) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  const oldParentId = existing.folder.parentId;

  const folder = await updateFolder(workspaceUuid, folderUuid, user.id, {
    bannerUrl: body.bannerUrl,
    iconColor: body.iconColor,
    name: body.name,
    parentId: body.parentId,
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  await publishFilesInvalidationEvent({
    workspaceUuid,
    folderId: folder.id,
    reason: "folder.updated",
  });
  const parentIds = new Set<string>();
  if (oldParentId) {
    parentIds.add(oldParentId);
  }
  if (folder.parentId) {
    parentIds.add(folder.parentId);
  }
  await Promise.all(
    [...parentIds].map((parentId) =>
      publishFilesInvalidationEvent({
        workspaceUuid,
        folderId: parentId,
        reason: "tree.changed",
      })
    )
  );
  await invalidateWorkspaceReadCaches(workspaceUuid);

  return NextResponse.json({ folder });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; folderUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, folderUuid } = await context.params;
  const canEdit = await userCanEditFolder({
    workspaceId: workspaceUuid,
    folderId: folderUuid,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }
  if (isSharedFilesVirtualFolderId(folderUuid, workspaceUuid)) {
    return NextResponse.json(
      { error: "Shared Files is read-only" },
      { status: 400 }
    );
  }
  const members = await listWorkspaceMembers(workspaceUuid);
  const currentMember = members.find((member) => member.userId === user.id);
  if (!(currentMember && ["owner", "admin"].includes(currentMember.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deletedFolder = await softDeleteFolder(workspaceUuid, folderUuid);
  if (!deletedFolder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  await publishFilesInvalidationEvent({
    workspaceUuid,
    folderId: folderUuid,
    reason: "folder.deleted",
  });
  await publishFilesInvalidationEvent({
    workspaceUuid,
    reason: "tree.changed",
  });
  await invalidateWorkspaceReadCaches(workspaceUuid);
  return NextResponse.json({ ok: true });
}
