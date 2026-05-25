import { zipSync } from "fflate";
import {
  getFolderWithAncestors,
  listWorkspaceFiles,
  listWorkspaceFolders,
} from "@/lib/file-data";
import { buildWorkspaceItemArchiveEntry } from "./workspace-item-archive-file";
import {
  addArchiveEntry,
  createArchiveDownloadResponse,
  sanitizeArchiveSegment,
  type WorkspaceArchiveItem,
} from "./workspace-item-archive-model";

async function appendWorkspaceFolderArchiveEntries(input: {
  archiveEntries: Record<string, Uint8Array>;
  folderId: string;
  folderById: Map<
    string,
    {
      id: string;
      name: string;
      parentId: string | null;
    }
  >;
  userId: string;
  workspaceFiles: Array<{
    id: string;
    folderId: string;
  }>;
  workspaceFolders: Array<{
    id: string;
    name: string;
    parentId: string | null;
  }>;
  workspaceUuid: string;
}) {
  const folderTree = await getFolderWithAncestors(
    input.workspaceUuid,
    input.folderId,
    input.userId
  );
  if (!folderTree?.folder) {
    return { error: "Folder not found" as const };
  }

  const sourceFolder = input.workspaceFolders.find(
    (folder) => folder.id === input.folderId
  );
  if (!sourceFolder) {
    return { error: "Folder not found" as const };
  }

  const sourceFolderIds = new Set<string>([sourceFolder.id]);
  for (const folder of input.workspaceFolders) {
    let cursor = folder.parentId;
    while (cursor) {
      if (cursor === sourceFolder.id) {
        sourceFolderIds.add(folder.id);
        break;
      }
      cursor = input.folderById.get(cursor)?.parentId ?? null;
    }
  }

  const rootFolderName = sanitizeArchiveSegment(sourceFolder.name);
  for (const file of input.workspaceFiles.filter((entry) =>
    sourceFolderIds.has(entry.folderId)
  )) {
    const pathSegments = [rootFolderName];
    let cursor: string | null = file.folderId;
    const folderSegments: string[] = [];
    while (cursor && cursor !== sourceFolder.id) {
      const folder = input.folderById.get(cursor);
      if (!folder) {
        break;
      }
      folderSegments.unshift(sanitizeArchiveSegment(folder.name));
      cursor = folder.parentId;
    }
    pathSegments.push(...folderSegments);

    const entry = await buildWorkspaceItemArchiveEntry(
      input.workspaceUuid,
      file.id
    );
    if (!entry) {
      continue;
    }

    addArchiveEntry(
      input.archiveEntries,
      [...pathSegments, entry.fileName].join("/"),
      entry.bytes
    );
  }

  return { error: null };
}

export async function handleWorkspaceItemArchiveSelection(input: {
  requestedItems: WorkspaceArchiveItem[];
  userId: string;
  workspaceUuid: string;
}) {
  const archiveEntries: Record<string, Uint8Array> = {};
  const includesFolder = input.requestedItems.some(
    (item) => item.kind === "folder"
  );
  const [workspaceFolders, workspaceFiles] = includesFolder
    ? await Promise.all([
        listWorkspaceFolders(input.workspaceUuid, input.userId),
        listWorkspaceFiles(input.workspaceUuid, input.userId),
      ])
    : [[], []];

  const folderById = new Map(
    workspaceFolders.map((folder) => [folder.id, folder])
  );

  for (const item of input.requestedItems) {
    if (item.kind === "file") {
      const entry = await buildWorkspaceItemArchiveEntry(
        input.workspaceUuid,
        item.id
      );
      if (!entry) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      addArchiveEntry(archiveEntries, entry.entryName, entry.bytes);
      continue;
    }

    const result = await appendWorkspaceFolderArchiveEntries({
      archiveEntries,
      folderById,
      folderId: item.id,
      userId: input.userId,
      workspaceFiles,
      workspaceFolders,
      workspaceUuid: input.workspaceUuid,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 404 });
    }
  }

  const zipBytes = zipSync(archiveEntries, { level: 0 });
  const archiveFileName = `${
    input.requestedItems.length === 1 ? "archive" : "selection"
  }.zip`;

  return createArchiveDownloadResponse({
    bytes: zipBytes,
    contentType: "application/zip",
    fileName: archiveFileName,
  });
}
