import {
  canUserAccessSharedResource,
  createFolder,
  createWorkspaceNoteFile,
  getFileAssetById,
  getFolderWithAncestors,
  getNoteContent,
  isMarkdownFileRecord,
  listWorkspaceFiles,
  listWorkspaceFolders,
  listWorkspacesForUser,
  registerFileAsset,
  resolveResourceShareLink,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

type DuplicateBody = {
  workspaceId?: string;
};

function resolveDuplicateName(existingNames: string[], requestedName: string) {
  const existingNameSet = new Set(
    existingNames.map((name) => name.toLowerCase())
  );

  const dotIndex = requestedName.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex < requestedName.length - 1;
  const baseName = hasExtension
    ? requestedName.slice(0, dotIndex)
    : requestedName;
  const extension = hasExtension ? requestedName.slice(dotIndex) : "";
  const safeBaseName = baseName || "Untitled";

  if (!existingNameSet.has(requestedName.toLowerCase())) {
    return requestedName;
  }

  let copyIndex = 1;
  while (copyIndex < 10_000) {
    const suffix = ` (${copyIndex})`;
    const maxBaseLength = Math.max(1, 255 - extension.length - suffix.length);
    const candidate = `${safeBaseName.slice(0, maxBaseLength)}${suffix}${extension}`;
    if (!existingNameSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    copyIndex += 1;
  }

  return `${safeBaseName}-${randomUUID().slice(0, 8)}${extension}`;
}

async function duplicateFileIntoWorkspace(input: {
  fileId: string;
  sourceWorkspaceId: string;
  targetFolderId: string;
  targetWorkspaceId: string;
  userId: string;
}) {
  const source = await getFileAssetById(input.sourceWorkspaceId, input.fileId);
  if (!source) {
    return null;
  }

  const workspaceFiles = await listWorkspaceFiles(input.targetWorkspaceId);
  const siblingNames = workspaceFiles
    .filter((file) => file.folderId === input.targetFolderId)
    .map((file) => file.name);
  const duplicateName = resolveDuplicateName(siblingNames, source.name);

  if (isMarkdownFileRecord(source)) {
    const note = await getNoteContent(source.id);
    const content =
      note?.content ??
      (await fetch(source.storageUrl, { cache: "no-store" })
        .then((response) => (response.ok ? response.text() : ""))
        .catch(() => ""));
    const file = await createWorkspaceNoteFile({
      baseContent: content,
      content,
      folderId: input.targetFolderId,
      name: duplicateName,
      userId: input.userId,
      workspaceId: input.targetWorkspaceId,
    });
    return { file, folderId: input.targetFolderId };
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

  return { file, folderId: input.targetFolderId };
}

async function duplicateFolderIntoWorkspace(input: {
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
    return null;
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
    return null;
  }

  const siblingNames = targetFolders
    .filter((folder) => folder.parentId === input.targetRootFolderId)
    .map((folder) => folder.name);
  const rootFolder = await createFolder(
    input.targetWorkspaceId,
    input.targetRootFolderId,
    resolveDuplicateName(siblingNames, sourceFolder.name),
    input.userId
  );

  if (!rootFolder) {
    return null;
  }

  const descendants = sourceFolders.filter((folder) => {
    let cursor = folder.parentId;
    while (cursor) {
      if (cursor === sourceFolder.id) {
        return true;
      }
      cursor =
        sourceFolders.find((candidate) => candidate.id === cursor)?.parentId ??
        null;
    }
    return false;
  });

  const createdFolderBySourceId = new Map<string, string>([
    [sourceFolder.id, rootFolder.id],
  ]);
  const descendantsByDepth = descendants.sort((left, right) => {
    const depth = (folderId: string) => {
      let value = 0;
      let cursor =
        sourceFolders.find((folder) => folder.id === folderId)?.parentId ??
        null;
      while (cursor) {
        value += 1;
        cursor =
          sourceFolders.find((folder) => folder.id === cursor)?.parentId ??
          null;
      }
      return value;
    };
    return depth(left.id) - depth(right.id);
  });

  for (const folder of descendantsByDepth) {
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
      resolveDuplicateName(targetSiblingNames, folder.name),
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

    await duplicateFileIntoWorkspace({
      fileId: file.id,
      sourceWorkspaceId: input.sourceWorkspaceId,
      targetFolderId: clonedFolderId,
      targetWorkspaceId: input.targetWorkspaceId,
      userId: input.userId,
    });
  }

  return rootFolder;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;
  const link = await resolveResourceShareLink(token);
  if (!link) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const hasAccess = await canUserAccessSharedResource({
    link,
    userId: user.id,
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(link.resourceType === "file" || link.resourceType === "folder")) {
    return NextResponse.json(
      { error: "Only files and folders can be copied." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as DuplicateBody;
  if (!body.workspaceId) {
    return NextResponse.json(
      { error: "Workspace is required." },
      { status: 400 }
    );
  }

  const workspaces = await listWorkspacesForUser(user.id);
  const targetWorkspace = workspaces.find(
    (workspace) => workspace.workspaceId === body.workspaceId
  );
  if (!targetWorkspace) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 }
    );
  }

  if (link.resourceType === "file") {
    const duplicated = await duplicateFileIntoWorkspace({
      fileId: link.resourceId,
      sourceWorkspaceId: link.workspaceId,
      targetFolderId: targetWorkspace.rootFolderId,
      targetWorkspaceId: targetWorkspace.workspaceId,
      userId: user.id,
    });

    if (!duplicated) {
      return NextResponse.json(
        { error: "Unable to copy file." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      copied: true,
      route: `/workspace/files/${targetWorkspace.workspaceId}/folder/${duplicated.folderId}?file=${duplicated.file.id}`,
    });
  }

  const duplicatedFolder = await duplicateFolderIntoWorkspace({
    folderId: link.resourceId,
    sourceWorkspaceId: link.workspaceId,
    targetRootFolderId: targetWorkspace.rootFolderId,
    targetWorkspaceId: targetWorkspace.workspaceId,
    userId: user.id,
  });

  if (!duplicatedFolder) {
    return NextResponse.json(
      { error: "Unable to copy folder." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    copied: true,
    route: `/workspace/files/${targetWorkspace.workspaceId}/folder/${duplicatedFolder.id}`,
  });
}
