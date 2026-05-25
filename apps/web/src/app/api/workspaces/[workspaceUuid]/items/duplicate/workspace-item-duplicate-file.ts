import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  createWorkspaceNoteFile,
  getFileAssetById,
  getFolderWithAncestors,
  getNoteContent,
  isMarkdownFileRecord,
  isSharedFilesVirtualFolderId,
  listWorkspaceFiles,
  registerFileAsset,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { resolveDuplicateName } from "./workspace-item-duplicate-model";

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

export async function handleDuplicateWorkspaceFile(input: {
  fileId: string;
  parentId?: string | null;
  userId: string;
  workspaceUuid: string;
}) {
  const source = await getFileAssetById(input.workspaceUuid, input.fileId);
  if (!source) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const targetFolderId = input.parentId ?? source.folderId;
  if (isSharedFilesVirtualFolderId(targetFolderId, input.workspaceUuid)) {
    return NextResponse.json(
      { error: "Cannot create items in Shared Files" },
      { status: 400 }
    );
  }

  const targetFolder = await getFolderWithAncestors(
    input.workspaceUuid,
    targetFolderId,
    input.userId
  );
  if (!targetFolder?.folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const workspaceFiles = await listWorkspaceFiles(
    input.workspaceUuid,
    input.userId
  );
  const siblingNames = workspaceFiles
    .filter((file) => file.folderId === targetFolderId)
    .map((file) => file.name);
  const duplicateName = resolveDuplicateName(siblingNames, source.name);

  if (isMarkdownFileRecord(source)) {
    const content = await loadDuplicateNoteContent({
      fileId: source.id,
      storageUrl: source.storageUrl,
    });
    const file = await createWorkspaceNoteFile({
      baseContent: content,
      content,
      folderId: targetFolderId,
      name: duplicateName,
      userId: input.userId,
      workspaceId: input.workspaceUuid,
    });

    await Promise.all([
      invalidateWorkspaceReadCaches(input.workspaceUuid),
      publishFilesInvalidationEvent({
        fileId: file.id,
        workspaceUuid: input.workspaceUuid,
        reason: "file.created",
      }),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        reason: "tree.changed",
      }),
    ]);

    return NextResponse.json({ file }, { status: 201 });
  }

  const file = await registerFileAsset(input.workspaceUuid, input.userId, {
    contentHashSha256: source.contentHashSha256 ?? null,
    folderId: targetFolderId,
    hashComputedBy: source.hashComputedBy as
      | "client"
      | "server"
      | null
      | undefined,
    hashVerificationStatus: source.hashVerificationStatus as
      | "failed"
      | "pending"
      | "verified"
      | null
      | undefined,
    storageKey: `virtual:duplicate:${source.id}:${randomUUID()}`,
    storageUrl: source.storageUrl,
    name: duplicateName,
    mimeType: source.mimeType,
    sizeBytes: source.sizeBytes,
  });

  await Promise.all([
    invalidateWorkspaceReadCaches(input.workspaceUuid),
    publishFilesInvalidationEvent({
      fileId: file.id,
      workspaceUuid: input.workspaceUuid,
      reason: "file.created",
    }),
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    }),
  ]);

  return NextResponse.json({ file }, { status: 201 });
}
