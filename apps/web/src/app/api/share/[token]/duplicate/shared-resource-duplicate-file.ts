import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createWorkspaceNoteFile,
  getFileAssetById,
  getNoteContent,
  isMarkdownFileRecord,
  listWorkspaceFiles,
  registerFileAsset,
} from "@/lib/file-data";
import { resolveSharedDuplicateName } from "./shared-resource-duplicate-model";

async function loadSharedDuplicateNoteContent(input: {
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

export async function duplicateSharedFileIntoWorkspace(input: {
  buildRoute: (input: { fileId: string; folderId: string }) => string;
  fileId: string;
  sourceWorkspaceId: string;
  targetFolderId: string;
  targetWorkspaceId: string;
  userId: string;
}) {
  const source = await getFileAssetById(input.sourceWorkspaceId, input.fileId);
  if (!source) {
    return NextResponse.json(
      { error: "Unable to copy file." },
      { status: 500 }
    );
  }

  const workspaceFiles = await listWorkspaceFiles(input.targetWorkspaceId);
  const siblingNames = workspaceFiles.flatMap((file) =>
    file.folderId === input.targetFolderId ? [file.name] : []
  );
  const duplicateName = resolveSharedDuplicateName(siblingNames, source.name);

  if (isMarkdownFileRecord(source)) {
    const content = await loadSharedDuplicateNoteContent({
      fileId: source.id,
      storageUrl: source.storageUrl,
    });
    const file = await createWorkspaceNoteFile({
      baseContent: content,
      content,
      folderId: input.targetFolderId,
      name: duplicateName,
      userId: input.userId,
      workspaceId: input.targetWorkspaceId,
    });
    return NextResponse.json({
      copied: true,
      route: input.buildRoute({
        fileId: file.id,
        folderId: input.targetFolderId,
      }),
    });
  }

  const file = await registerFileAsset(input.targetWorkspaceId, input.userId, {
    contentHashSha256: source.contentHashSha256 ?? null,
    folderId: input.targetFolderId,
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

  return NextResponse.json({
    copied: true,
    route: input.buildRoute({
      fileId: file.id,
      folderId: input.targetFolderId,
    }),
  });
}
