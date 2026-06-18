import type { z } from "zod";
import {
  buildWorkspacePathMaps,
  getWorkspacePathForFile,
  publishTreeMutationEvents,
  readWorkspaceFileContent,
  resolveFileIdByPathHint,
  resolveFolderIdByPathHint,
} from "@/lib/chat-tools/workspace-file-helpers";
import {
  createFolder,
  getFileAssetById,
  listWorkspaceFiles,
  listWorkspaceFolders,
  softDeleteFileAsset,
  updateFileAsset,
  userCanEditFolder,
} from "@/lib/file-data";

interface FileOperationContext {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

type ListFilesInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["list_files"]["input"]
>;

type ReadFileInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["read_file"]["input"]
>;

type MoveFileInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["move_file"]["input"]
>;

type DeleteFileInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["delete_file"]["input"]
>;

type CreateFolderInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["create_folder"]["input"]
>;

type GetFileInfoInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["get_file_info"]["input"]
>;

export async function executeListFiles(
  ctx: FileOperationContext,
  input: ListFilesInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const maxResults = input.maxResults ?? 100;

  let files = await listWorkspaceFiles(ctx.workspaceId, ctx.userId);

  if (input.folderPath) {
    const folderId = resolveFolderIdByPathHint(maps, ctx.rootFolderId, input.folderPath);
    if (folderId) {
      files = files.filter((file) => file.folderId === folderId);
    }
  }

  files = files
    .sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    )
    .slice(0, maxResults);

  return {
    files: files.map((file) => ({
      excerpt: "",
      fileId: file.id,
      workspacePath: getWorkspacePathForFile(file, maps),
    })),
    totalCount: files.length,
  };
}

export async function executeReadFile(
  ctx: FileOperationContext,
  input: ReadFileInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const fileId = resolveFileIdByPathHint(maps, input.fileId) ?? input.fileId;
  const file = await getFileAssetById(ctx.workspaceId, fileId);

  if (!file) {
    throw new Error(`File not found: ${input.fileId}`);
  }

  const result = await readWorkspaceFileContent({
    workspaceId: ctx.workspaceId,
    file,
    maps,
    maxChars: input.maxChars ?? 16000,
  });

  return {
    content: result.content,
    fileId: result.fileId,
    mimeType: result.mimeType,
    workspacePath: result.workspacePath,
  };
}

export async function executeMoveFile(
  ctx: FileOperationContext,
  input: MoveFileInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const file = await getFileAssetById(ctx.workspaceId, input.fileId);

  if (!file) {
    throw new Error(`File not found: ${input.fileId}`);
  }

  const targetFolder = await getFileAssetById(ctx.workspaceId, input.destinationFolderId);
  if (!targetFolder) {
    throw new Error(`Destination folder not found: ${input.destinationFolderId}`);
  }

  await userCanEditFolder({
    workspaceId: ctx.workspaceId,
    folderId: input.destinationFolderId,
    userId: ctx.userId,
  });

  const updated = await updateFileAsset(
    ctx.workspaceId,
    input.fileId,
    ctx.userId,
    { folderId: input.destinationFolderId }
  );

  if (!updated) {
    throw new Error("Unable to move the file.");
  }

  await publishTreeMutationEvents({
    fileId: input.fileId,
    folderId: file.folderId,
    reason: "file.updated",
    workspaceId: ctx.workspaceId,
  });

  return {
    fileId: input.fileId,
    workspacePath: getWorkspacePathForFile(updated, maps),
  };
}

export async function executeDeleteFile(
  ctx: FileOperationContext,
  input: DeleteFileInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const file = await getFileAssetById(ctx.workspaceId, input.fileId);

  if (!file) {
    throw new Error(`File not found: ${input.fileId}`);
  }

  const workspacePath = getWorkspacePathForFile(file, maps);
  await softDeleteFileAsset(ctx.workspaceId, input.fileId, ctx.userId);

  await publishTreeMutationEvents({
    fileId: input.fileId,
    folderId: file.folderId,
    reason: "file.deleted",
    workspaceId: ctx.workspaceId,
  });

  return {
    fileId: input.fileId,
    workspacePath,
  };
}

export async function executeCreateFolder(
  ctx: FileOperationContext,
  input: CreateFolderInput
) {
  const parentId = input.parentFolderId ?? ctx.rootFolderId;

  const folder = await createFolder(
    ctx.workspaceId,
    parentId,
    input.name,
    ctx.userId
  );

  if (!folder) {
    throw new Error("Unable to create the folder.");
  }

  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const folderPath = maps.folderPathById.get(folder.id) ?? input.name;

  await publishTreeMutationEvents({
    folderId: folder.id,
    reason: "file.created",
    workspaceId: ctx.workspaceId,
  });

  return {
    folderId: folder.id,
    folderPath,
  };
}

export async function executeGetFileInfo(
  ctx: FileOperationContext,
  input: GetFileInfoInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);
  const fileId = resolveFileIdByPathHint(maps, input.fileId) ?? input.fileId;
  const file = await getFileAssetById(ctx.workspaceId, fileId);

  if (!file) {
    throw new Error(`File not found: ${input.fileId}`);
  }

  return {
    fileId: file.id,
    mimeType: file.mimeType ?? null,
    updatedAt: file.updatedAt,
    workspacePath: getWorkspacePathForFile(file, maps),
  };
}
