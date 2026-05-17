import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  type BulkActionItem,
  type BulkMutationResponse,
  type FileMutationHistoryEntry,
  filterWritableBulkActionItems,
  getMutationHistoryItemKey,
  getSuccessfulBulkMutationKeys,
} from "@/components/files/explorer/workspace-bulk-operations-model";

export function canMoveExplorerFolder(input: {
  allFolders: FolderRecord[];
  folderId: string;
  targetFolderId: string;
  workspaceUuid: string;
}) {
  const { allFolders, folderId, targetFolderId, workspaceUuid } = input;
  if (!workspaceUuid) {
    return false;
  }

  const folder = allFolders.find((entry) => entry.id === folderId);
  const targetFolder = allFolders.find((entry) => entry.id === targetFolderId);
  if (folder?.readOnly || targetFolder?.readOnly) {
    return false;
  }
  if (folderId === targetFolderId) {
    return false;
  }

  const byId = new Map(allFolders.map((entry) => [entry.id, entry]));
  let cursor = byId.get(targetFolderId);
  while (cursor?.parentId) {
    if (cursor.parentId === folderId) {
      return false;
    }
    cursor = byId.get(cursor.parentId);
  }

  return true;
}

export function buildMoveFolderHistoryEntry(input: {
  allFolders: FolderRecord[];
  folderId: string;
  targetFolderId: string;
}): FileMutationHistoryEntry | null {
  const folder = input.allFolders.find((entry) => entry.id === input.folderId);
  if (!folder?.parentId) {
    return null;
  }

  return {
    items: [
      {
        fromFolderId: folder.parentId,
        id: folder.id,
        kind: "folder",
        toFolderId: input.targetFolderId,
      },
    ],
    operation: "move",
  };
}

export function resolveBulkMutationHistoryOutcome<
  T extends
    | BulkActionItem
    | NonNullable<FileMutationHistoryEntry["items"]>[number],
>(input: { items: T[]; result: BulkMutationResponse | null }) {
  const successfulKeys = getSuccessfulBulkMutationKeys(input.result);
  return {
    successfulItems: input.items.filter((item) =>
      successfulKeys.has(getMutationHistoryItemKey(item))
    ),
    totalCount: input.result?.summary?.total ?? input.items.length,
  };
}

export function resolveExplorerHardReingestFiles(input: {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  items: BulkActionItem[];
}) {
  return filterWritableBulkActionItems({
    files: input.allFiles,
    folders: input.allFolders,
    items: input.items,
  })
    .filter((item) => item.kind === "file")
    .map((item) => input.allFiles.find((entry) => entry.id === item.id))
    .filter((file): file is FileRecord => Boolean(file));
}

export function describeExplorerHardReingestSuccessCount(succeeded: number) {
  return succeeded === 1
    ? "File queued for hard re-ingestion."
    : `${succeeded} files queued for hard re-ingestion.`;
}
