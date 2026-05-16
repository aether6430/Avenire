import {
  detectPreviewKind,
  type FileRecord,
  type FolderRecord,
} from "@/components/files/explorer/shared";
import { readWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import { readWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";
import { readCachedWorkspaceTreePayload } from "@/lib/workspace-tree-client";

export interface WorkspaceFolderSnapshot {
  ancestors: FolderRecord[];
  files: FileRecord[];
  folders: FolderRecord[];
}

function hydrateFileFromMarkdownCache(
  workspaceUuid: string,
  file: FileRecord
): FileRecord {
  if (!detectPreviewKind(file).isMarkdown) {
    return file;
  }

  const cachedMarkdown = readWorkspaceMarkdownCache(workspaceUuid, file.id);
  if (!cachedMarkdown) {
    return file;
  }

  const fileUpdatedAt = file.updatedAt ?? null;
  if (cachedMarkdown.updatedAt !== fileUpdatedAt) {
    return file;
  }

  return {
    ...file,
    noteContent: cachedMarkdown.body,
  };
}

export function deriveWorkspaceFolderSnapshotFromTree(input: {
  folderId: string;
  hydrateFile?: (file: FileRecord) => FileRecord;
  treePayload: {
    files: FileRecord[];
    folders: FolderRecord[];
  };
}): WorkspaceFolderSnapshot | null {
  const folderById = new Map(
    input.treePayload.folders.map((folder) => [folder.id, folder] as const)
  );
  const currentFolder = folderById.get(input.folderId);
  if (!currentFolder) {
    return null;
  }

  const ancestors: FolderRecord[] = [];
  const seen = new Set<string>();
  let cursor: FolderRecord | undefined = currentFolder;

  while (cursor && !seen.has(cursor.id)) {
    ancestors.push(cursor);
    seen.add(cursor.id);
    cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined;
  }

  const hydrateFile = input.hydrateFile ?? ((file: FileRecord) => file);

  return {
    ancestors: ancestors.reverse(),
    files: input.treePayload.files
      .filter((file) => file.folderId === input.folderId)
      .map(hydrateFile),
    folders: input.treePayload.folders.filter(
      (folder) => folder.parentId === input.folderId
    ),
  };
}

export function readVisibleWorkspaceFolderSnapshot(
  workspaceUuid: string,
  folderId: string
): WorkspaceFolderSnapshot | null {
  const cached = readWorkspaceFolderCache<FolderRecord, FileRecord>(
    workspaceUuid,
    folderId
  );
  if (cached) {
    return {
      ancestors: cached.ancestors,
      files: cached.files,
      folders: cached.folders,
    };
  }

  const treePayload = readCachedWorkspaceTreePayload<FolderRecord, FileRecord>(
    workspaceUuid
  );
  if (!treePayload) {
    return null;
  }

  return deriveWorkspaceFolderSnapshotFromTree({
    folderId,
    hydrateFile: (file) => hydrateFileFromMarkdownCache(workspaceUuid, file),
    treePayload,
  });
}
