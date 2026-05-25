"use client";

import { useCallback } from "react";
import {
  restoreExplorerItemsFromTrash,
  runExplorerBulkMutation,
} from "@/components/files/explorer/explorer-mutation-client";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  type ExplorerContextActionSnapshot,
  useExplorerFileActionOperations,
} from "@/components/files/explorer/use-explorer-file-action-operations";
import { useExplorerFileDownloads } from "@/components/files/explorer/use-explorer-file-downloads";
import { useExplorerFileOperationHistory } from "@/components/files/explorer/use-explorer-file-operation-history";
import type {
  BulkItemKind,
  FileMutationHistoryItem,
} from "@/components/files/explorer/workspace-bulk-operations-model";
import type { useFileSelection } from "@/hooks/use-file-selection";
import { filesPinsActions } from "@/stores/filesPinsStore";

interface UseExplorerFileOperationsOptions {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  contextActionIdsRef: React.MutableRefObject<ExplorerContextActionSnapshot | null>;
  emitSync: () => void;
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  selection: ReturnType<typeof useFileSelection>;
  workspaceUuid: string;
}

export function useExplorerFileOperations({
  allFiles,
  allFolders,
  contextActionIdsRef,
  emitSync,
  loadFolder,
  loadTree,
  selection,
  workspaceUuid,
}: UseExplorerFileOperationsOptions) {
  const runBulkMutation = useCallback(
    async (payload: {
      items: Array<{ id: string; kind: BulkItemKind }>;
      operation: "delete" | "move";
      targetFolderId?: string;
    }) => runExplorerBulkMutation({ payload, workspaceUuid }),
    [workspaceUuid]
  );

  const refreshExplorerAfterMutation = useCallback(async () => {
    await Promise.all([loadFolder(), loadTree()]);
    emitSync();
    selection.clearSelection();
  }, [emitSync, loadFolder, loadTree, selection]);

  const restoreItemsFromTrash = useCallback(
    (items: FileMutationHistoryItem[]) =>
      restoreExplorerItemsFromTrash({ items, workspaceUuid }),
    [workspaceUuid]
  );

  const {
    canRedoFileOperation,
    canUndoFileOperation,
    fileOperationHistoryBusy,
    pushMutationHistoryEntry,
    redoLatestFileOperation,
    undoLatestFileOperation,
  } = useExplorerFileOperationHistory({
    refreshAfterMutation: refreshExplorerAfterMutation,
    restoreItemsFromTrash,
    runBulkMutation,
  });

  const { downloadItemArchive, downloadSelectionArchive, downloadStatus } =
    useExplorerFileDownloads({
      workspaceUuid,
    });

  const {
    deleteContextActionItems,
    deleteSelectionItems,
    downloadContextActionItems,
    duplicateContextActionItems,
    duplicateItem,
    getContextActionItems,
    getSelectedActionItems,
    hardReingestContextActionItems,
    moveContextActionItemsToFolder,
    moveFolder,
    moveItemsToFolder,
  } = useExplorerFileActionOperations({
    allFiles,
    allFolders,
    contextActionIdsRef,
    downloadSelectionArchive,
    emitSync,
    loadFolder,
    loadTree,
    pushMutationHistoryEntry,
    runBulkMutation,
    selection,
    workspaceUuid,
  });

  const isPinnedItem = useCallback(
    (kind: "file" | "folder", itemId: string) =>
      Boolean(filesPinsActions.isPinned(workspaceUuid, kind, itemId)),
    [workspaceUuid]
  );

  const togglePinnedWorkspaceItem = useCallback(
    (item: {
      folderId: string | null;
      id: string;
      kind: "file" | "folder";
      name: string;
      workspaceId: string;
    }) => {
      filesPinsActions.togglePinnedItem(workspaceUuid, item);
    },
    [workspaceUuid]
  );

  return {
    canRedoFileOperation,
    canUndoFileOperation,
    deleteContextActionItems,
    deleteSelectionItems,
    downloadContextActionItems,
    downloadItemArchive,
    downloadStatus,
    duplicateContextActionItems,
    duplicateItem,
    fileOperationHistoryBusy,
    getContextActionItems,
    getSelectedActionItems,
    hardReingestContextActionItems,
    isPinnedItem,
    moveContextActionItemsToFolder,
    moveFolder,
    moveItemsToFolder,
    redoLatestFileOperation,
    togglePinnedWorkspaceItem,
    undoLatestFileOperation,
  };
}
