import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  createFolder,
  createWorkspaceNoteFile,
  getFolderWithAncestors,
  getNoteContent,
  isMarkdownFileRecord,
  isSharedFilesVirtualFolderId,
  listWorkspaceFiles,
  listWorkspaceFolders,
  registerFileAsset,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  collectDuplicateDescendants,
  resolveDuplicateName,
} from "./workspace-item-duplicate-model";

async function loadDuplicateNoteContent(input: {
  fileId: string;
  storageUrl: string;
}) {
  const note = await getNoteContent(input.fileId);
  if (typeof note?.content === "string") {
    return note.content;
  }

  return fetch(input.storageUrl, { cache: "no-store" })
    .then((response) => (response.ok ? response.text() : ""))
    .catch(() => "");
}

export async function handleDuplicateWorkspaceFolder(input: {
  folderId: string;
  parentId?: string | null;
  userId: string;
  workspaceUuid: string;
}) {
  const sourceTree = await getFolderWithAncestors(
    input.workspaceUuid,
    input.folderId,
    input.userId
  );
  if (!sourceTree?.folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const [workspaceFolders, workspaceFiles] = await Promise.all([
    listWorkspaceFolders(input.workspaceUuid, input.userId),
    listWorkspaceFiles(input.workspaceUuid, input.userId),
  ]);

  const sourceFolder = workspaceFolders.find(
    (folder) => folder.id === input.folderId
  );
  if (!sourceFolder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const targetParentId = input.parentId ?? sourceFolder.parentId;
  if (
    targetParentId &&
    isSharedFilesVirtualFolderId(targetParentId, input.workspaceUuid)
  ) {
    return NextResponse.json(
      { error: "Cannot create items in Shared Files" },
      { status: 400 }
    );
  }

  if (targetParentId) {
    const targetParent = await getFolderWithAncestors(
      input.workspaceUuid,
      targetParentId,
      input.userId
    );
    if (!targetParent?.folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const siblingNames = workspaceFolders
    .filter((folder) => folder.parentId === targetParentId)
    .map((folder) => folder.name);
  const duplicateRootName = resolveDuplicateName(
    siblingNames,
    sourceFolder.name
  );
  const rootFolder = await createFolder(
    input.workspaceUuid,
    targetParentId ?? sourceFolder.parentId ?? sourceFolder.id,
    duplicateRootName,
    input.userId
  );

  if (!rootFolder) {
    return NextResponse.json(
      { error: "Unable to duplicate folder" },
      { status: 500 }
    );
  }

  const descendants = collectDuplicateDescendants(
    workspaceFolders,
    sourceFolder.id
  );
  const createdFolderBySourceId = new Map<string, string>([
    [sourceFolder.id, rootFolder.id],
  ]);

  for (const folder of descendants) {
    const clonedParentId = createdFolderBySourceId.get(folder.parentId ?? "");
    if (!clonedParentId) {
      continue;
    }

    const folderSiblingNames = workspaceFolders
      .filter((candidate) => candidate.parentId === clonedParentId)
      .map((candidate) => candidate.name);
    const createdFolder = await createFolder(
      input.workspaceUuid,
      clonedParentId,
      resolveDuplicateName(folderSiblingNames, folder.name),
      input.userId
    );
    if (createdFolder) {
      createdFolderBySourceId.set(folder.id, createdFolder.id);
    }
  }

  const sourceFolderIds = new Set<string>([
    sourceFolder.id,
    ...descendants.map((folder) => folder.id),
  ]);

  for (const file of workspaceFiles.filter((entry) =>
    sourceFolderIds.has(entry.folderId)
  )) {
    const clonedFolderId = createdFolderBySourceId.get(file.folderId);
    if (!clonedFolderId) {
      continue;
    }

    const siblingFileNames = workspaceFiles
      .filter((entry) => entry.folderId === clonedFolderId)
      .map((entry) => entry.name);

    if (isMarkdownFileRecord(file)) {
      const content = await loadDuplicateNoteContent({
        fileId: file.id,
        storageUrl: file.storageUrl,
      });
      await createWorkspaceNoteFile({
        baseContent: content,
        content,
        folderId: clonedFolderId,
        name: resolveDuplicateName(siblingFileNames, file.name),
        userId: input.userId,
        workspaceId: input.workspaceUuid,
      });
      continue;
    }

    await registerFileAsset(input.workspaceUuid, input.userId, {
      contentHashSha256: file.contentHashSha256 ?? null,
      folderId: clonedFolderId,
      hashComputedBy: file.hashComputedBy as
        | "client"
        | "server"
        | null
        | undefined,
      hashVerificationStatus: file.hashVerificationStatus as
        | "failed"
        | "pending"
        | "verified"
        | null
        | undefined,
      storageKey: `virtual:duplicate:${file.id}:${randomUUID()}`,
      storageUrl: file.storageUrl,
      name: resolveDuplicateName(siblingFileNames, file.name),
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });
  }

  await Promise.all([
    invalidateWorkspaceReadCaches(input.workspaceUuid),
    publishFilesInvalidationEvent({
      folderId: rootFolder.id,
      workspaceUuid: input.workspaceUuid,
      reason: "folder.created",
    }),
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    }),
  ]);

  return NextResponse.json({ folder: rootFolder }, { status: 201 });
}
