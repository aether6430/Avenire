import type {
  FileRecord,
  FolderRecord,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import { formatBytes } from "@/components/files/explorer/shared";
import type { PinnedExplorerItem } from "@/stores/filesPinsStore";

export interface ExplorerSurfaceInfoEntry {
  label: string;
  value: string;
}

interface BuildExplorerCurrentPinnedItemOptions {
  activeFile: FileRecord | null;
  currentFolder: FolderRecord | null;
  workspaceUuid: string;
}

interface BuildExplorerCurrentInfoEntriesOptions {
  activeFile: FileRecord | null;
  currentFolder: FolderRecord | null;
  currentLocationTitle: string;
  filePathById: Map<string, string>;
  isAtWorkspaceRoot: boolean;
  workspaceMemberCount: number;
  workspaceMemberNameById: Map<string, string>;
}

function getExplorerVisibilityLabel(workspaceMemberCount: number) {
  if (workspaceMemberCount <= 0) {
    return "Workspace members";
  }

  return `${workspaceMemberCount} workspace member${
    workspaceMemberCount === 1 ? "" : "s"
  }`;
}

export function buildExplorerCurrentPinnedItem({
  activeFile,
  currentFolder,
  workspaceUuid,
}: BuildExplorerCurrentPinnedItemOptions): PinnedExplorerItem | null {
  if (activeFile) {
    return {
      folderId: activeFile.folderId,
      id: activeFile.id,
      kind: "file",
      name: activeFile.name,
      workspaceId: workspaceUuid,
    };
  }

  if (currentFolder) {
    return {
      folderId: currentFolder.parentId,
      id: currentFolder.id,
      kind: "folder",
      name: currentFolder.name,
      workspaceId: workspaceUuid,
    };
  }

  return null;
}

export function buildExplorerIsCurrentPinned(
  pinnedItems: PinnedExplorerItem[],
  currentPinnedItem: PinnedExplorerItem | null
) {
  if (!currentPinnedItem) {
    return false;
  }

  return pinnedItems.some(
    (item) =>
      item.kind === currentPinnedItem.kind && item.id === currentPinnedItem.id
  );
}

export function buildExplorerFolderSubfolderCount(folders: FolderRecord[]) {
  const countsByFolderId = new Map<string, number>();

  for (const folder of folders) {
    if (!folder.parentId) {
      continue;
    }

    countsByFolderId.set(
      folder.parentId,
      (countsByFolderId.get(folder.parentId) ?? 0) + 1
    );
  }

  return countsByFolderId;
}

export function buildExplorerFolderFileCount(files: FileRecord[]) {
  const countsByFolderId = new Map<string, number>();

  for (const file of files) {
    countsByFolderId.set(
      file.folderId,
      (countsByFolderId.get(file.folderId) ?? 0) + 1
    );
  }

  return countsByFolderId;
}

export function buildExplorerFolderPreviewKinds(
  files: FileRecord[],
  detectFileKind: (file: FileRecord) => string
) {
  const countsByFolder = new Map<string, Map<string, number>>();

  for (const file of files) {
    const kind = detectFileKind(file);
    const countsByKind =
      countsByFolder.get(file.folderId) ?? new Map<string, number>();
    countsByKind.set(kind, (countsByKind.get(kind) ?? 0) + 1);
    countsByFolder.set(file.folderId, countsByKind);
  }

  const previewKindsByFolder = new Map<string, string[]>();

  for (const [folderId, countsByKind] of countsByFolder.entries()) {
    const orderedKinds = [...countsByKind.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
      )
      .map(([kind]) => kind)
      .slice(0, 3);
    previewKindsByFolder.set(folderId, orderedKinds);
  }

  return previewKindsByFolder;
}

export function buildExplorerWorkspaceMemberNameById(
  workspaceMembers: WorkspaceMemberRecord[]
) {
  return new Map(
    workspaceMembers.map((member) => [
      member.userId ?? member.id ?? member.email ?? "",
      member.name ?? member.email ?? "Unknown",
    ])
  );
}

export function buildExplorerCurrentInfoEntries({
  activeFile,
  currentFolder,
  currentLocationTitle,
  filePathById,
  isAtWorkspaceRoot,
  workspaceMemberCount,
  workspaceMemberNameById,
}: BuildExplorerCurrentInfoEntriesOptions): ExplorerSurfaceInfoEntry[] {
  if (activeFile) {
    return [
      { label: "Name", value: activeFile.name },
      {
        label: "Owner",
        value:
          (activeFile.uploadedBy
            ? workspaceMemberNameById.get(activeFile.uploadedBy)
            : null) ?? "Unknown",
      },
      { label: "File size", value: formatBytes(activeFile.sizeBytes) },
      {
        label: "Ingestion",
        value: activeFile.isIngested ? "Ingested" : "Pending",
      },
      {
        label: "Visible to",
        value: getExplorerVisibilityLabel(workspaceMemberCount),
      },
      {
        label: "Location",
        value: filePathById.get(activeFile.id) ?? activeFile.name,
      },
      {
        label: "Created at",
        value: new Date(activeFile.createdAt).toLocaleString(),
      },
      {
        label: "Updated at",
        value: new Date(
          activeFile.updatedAt ?? activeFile.createdAt
        ).toLocaleString(),
      },
    ];
  }

  if (currentFolder) {
    return [
      {
        label: isAtWorkspaceRoot ? "Workspace" : "Folder name",
        value: currentLocationTitle,
      },
      {
        label: "Visible to",
        value: getExplorerVisibilityLabel(workspaceMemberCount),
      },
      {
        label: "Created at",
        value: currentFolder.createdAt
          ? new Date(currentFolder.createdAt).toLocaleString()
          : "Unknown",
      },
      {
        label: "Updated at",
        value: currentFolder.updatedAt
          ? new Date(currentFolder.updatedAt).toLocaleString()
          : "Unknown",
      },
    ];
  }

  return [];
}
