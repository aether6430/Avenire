import { NextResponse } from "next/server";
import {
  createFolder,
  getFolderWithAncestors,
  listWorkspaceFiles,
  listWorkspaceFolders,
} from "@/lib/file-data";
import { duplicateSharedFileIntoWorkspace } from "./shared-resource-duplicate-file";
import {
  collectSharedDuplicateDescendants,
  resolveSharedDuplicateName,
} from "./shared-resource-duplicate-model";

export async function duplicateSharedFolderIntoWorkspace(input: {
  buildRoute: (folderId: string) => string;
  folderId: string;
  sourceWorkspaceId: string;
  targetRootFolderId: string;
  targetWorkspaceId: string;
  userId: string;
}) {
  const sourceTree = await getFolderWithAncestors(
    input.sourceWorkspaceId,
    input.folderId
  );
  if (!sourceTree?.folder) {
    return NextResponse.json(
      { error: "Unable to copy folder." },
      { status: 500 }
    );
  }

  const [sourceFolders, sourceFiles, targetFolders] = await Promise.all([
    listWorkspaceFolders(input.sourceWorkspaceId),
    listWorkspaceFiles(input.sourceWorkspaceId),
    listWorkspaceFolders(input.targetWorkspaceId),
  ]);
  const sourceFolder = sourceFolders.find(
    (folder) => folder.id === input.folderId
  );
  if (!sourceFolder) {
    return NextResponse.json(
      { error: "Unable to copy folder." },
      { status: 500 }
    );
  }

  const siblingNames = targetFolders
    .filter((folder) => folder.parentId === input.targetRootFolderId)
    .map((folder) => folder.name);
  const rootFolder = await createFolder(
    input.targetWorkspaceId,
    input.targetRootFolderId,
    resolveSharedDuplicateName(siblingNames, sourceFolder.name),
    input.userId
  );

  if (!rootFolder) {
    return NextResponse.json(
      { error: "Unable to copy folder." },
      { status: 500 }
    );
  }

  const descendants = collectSharedDuplicateDescendants(
    sourceFolders,
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

    const targetSiblingNames = targetFolders
      .filter((candidate) => candidate.parentId === clonedParentId)
      .map((candidate) => candidate.name);
    const createdFolder = await createFolder(
      input.targetWorkspaceId,
      clonedParentId,
      resolveSharedDuplicateName(targetSiblingNames, folder.name),
      input.userId
    );
    if (createdFolder) {
      targetFolders.push(createdFolder);
      createdFolderBySourceId.set(folder.id, createdFolder.id);
    }
  }

  const sourceFolderIds = new Set<string>([
    sourceFolder.id,
    ...descendants.map((folder) => folder.id),
  ]);

  for (const file of sourceFiles.filter((entry) =>
    sourceFolderIds.has(entry.folderId)
  )) {
    const clonedFolderId = createdFolderBySourceId.get(file.folderId);
    if (!clonedFolderId) {
      continue;
    }

    await duplicateSharedFileIntoWorkspace({
      buildRoute: ({ fileId, folderId }) =>
        `/workspace/files/${input.targetWorkspaceId}/folder/${folderId}?file=${fileId}`,
      fileId: file.id,
      sourceWorkspaceId: input.sourceWorkspaceId,
      targetFolderId: clonedFolderId,
      targetWorkspaceId: input.targetWorkspaceId,
      userId: input.userId,
    });
  }

  return NextResponse.json({
    copied: true,
    route: input.buildRoute(rootFolder.id),
  });
}
