"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  duplicateExplorerItemTransport,
  moveExplorerFolderTransport,
  queueExplorerHardReingestTransport,
} from "@/components/files/explorer/explorer-mutation-client";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  type BulkActionItem,
  type BulkItemKind,
  type BulkMutationResponse,
  buildMoveBulkActionItems,
  buildMoveMutationHistoryItems,
  type FileMutationHistoryEntry,
  filterWritableBulkActionItems,
  getMutationHistoryItemKey,
  getSuccessfulBulkMutationKeys,
  resolveBulkActionItemsFromContext,
  resolveBulkActionItemsFromSelection,
} from "@/components/files/explorer/workspace-bulk-operations-model";
import type { useFileSelection } from "@/hooks/use-file-selection";

export interface ExplorerContextActionSnapshot {
  ids: string[];
  itemId: string;
}

interface UseExplorerFileActionOperationsOptions {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  contextActionIdsRef: React.MutableRefObject<ExplorerContextActionSnapshot | null>;
  downloadSelectionArchive: (
    items: BulkActionItem[],
    fallbackName?: string
  ) => Promise<void>;
  emitSync: () => void;
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  pushMutationHistoryEntry: (
    entry: FileMutationHistoryEntry,
    totalCount?: number
  ) => void;
  runBulkMutation: (payload: {
    items: Array<{ id: string; kind: BulkItemKind }>;
    operation: "delete" | "move";
    targetFolderId?: string;
  }) => Promise<BulkMutationResponse | null>;
  selection: ReturnType<typeof useFileSelection>;
  workspaceUuid: string;
}

export function useExplorerFileActionOperations({
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
}: UseExplorerFileActionOperationsOptions) {
  const refreshExplorerView = useCallback(
    async ({
      clearSelection = false,
      silentFolder = false,
    }: {
      clearSelection?: boolean;
      silentFolder?: boolean;
    } = {}) => {
      await Promise.all([
        loadFolder(silentFolder ? { silent: true } : undefined),
        loadTree(),
      ]);
      emitSync();
      if (clearSelection) {
        selection.clearSelection();
      }
    },
    [emitSync, loadFolder, loadTree, selection]
  );

  const moveFolder = useCallback(
    async (folderId: string, targetFolderId: string) => {
      if (!workspaceUuid) {
        return;
      }

      const folder = allFolders.find((entry) => entry.id === folderId);
      const targetFolder = allFolders.find(
        (entry) => entry.id === targetFolderId
      );
      if (folder?.readOnly || targetFolder?.readOnly) {
        return;
      }
      if (folderId === targetFolderId) {
        return;
      }

      const byId = new Map(allFolders.map((entry) => [entry.id, entry]));
      let cursor = byId.get(targetFolderId);
      while (cursor?.parentId) {
        if (cursor.parentId === folderId) {
          return;
        }
        cursor = byId.get(cursor.parentId);
      }

      await moveExplorerFolderTransport({
        folderId,
        targetFolderId,
        workspaceUuid,
      });

      if (folder?.parentId) {
        pushMutationHistoryEntry(
          {
            items: [
              {
                fromFolderId: folder.parentId,
                id: folder.id,
                kind: "folder",
                toFolderId: targetFolderId,
              },
            ],
            operation: "move",
          },
          1
        );
      }

      await refreshExplorerView();
    },
    [allFolders, pushMutationHistoryEntry, refreshExplorerView, workspaceUuid]
  );

  const getContextActionItems = useCallback(
    (itemId: string, fallbackKind: BulkItemKind) => {
      const snapshottedIds =
        contextActionIdsRef.current?.itemId === itemId
          ? contextActionIdsRef.current.ids
          : null;
      if (snapshottedIds) {
        contextActionIdsRef.current = null;
      }

      return resolveBulkActionItemsFromContext({
        fallbackKind,
        files: allFiles,
        folders: allFolders,
        itemId,
        selectedIds: selection.getSelectedIds(),
        snapshottedIds,
      });
    },
    [allFiles, allFolders, contextActionIdsRef, selection]
  );

  const getSelectedActionItems = useCallback(
    () =>
      resolveBulkActionItemsFromSelection({
        files: allFiles,
        folders: allFolders,
        selectedIds: selection.getSelectedIds(),
      }),
    [allFiles, allFolders, selection]
  );

  const deleteSelectionItems = useCallback(
    async (items: BulkActionItem[]) => {
      const writableItems = filterWritableBulkActionItems({
        files: allFiles,
        folders: allFolders,
        items,
      });

      if (writableItems.length === 0) {
        return;
      }

      const result = await runBulkMutation({
        items: writableItems,
        operation: "delete",
      });
      const successfulKeys = getSuccessfulBulkMutationKeys(result);
      const successfulItems = writableItems.filter((item) =>
        successfulKeys.has(getMutationHistoryItemKey(item))
      );
      const totalCount = result?.summary?.total ?? writableItems.length;

      if (successfulItems.length > 0) {
        pushMutationHistoryEntry(
          {
            items: successfulItems,
            operation: "delete",
          },
          totalCount
        );
      } else {
        toast.error("Unable to delete the selected items.");
      }

      await refreshExplorerView({ clearSelection: true });
    },
    [
      allFiles,
      allFolders,
      pushMutationHistoryEntry,
      refreshExplorerView,
      runBulkMutation,
    ]
  );

  const moveItemsToFolder = useCallback(
    async (itemIds: string[], targetFolderId: string) => {
      const items = buildMoveBulkActionItems({
        files: allFiles,
        folders: allFolders,
        itemIds,
        targetFolderId,
      });

      if (items.length === 0) {
        return;
      }

      const moveHistoryItems = buildMoveMutationHistoryItems({
        files: allFiles,
        folders: allFolders,
        items,
        targetFolderId,
      });

      const result = await runBulkMutation({
        items,
        operation: "move",
        targetFolderId,
      });
      const successfulKeys = getSuccessfulBulkMutationKeys(result);
      const successfulItems = moveHistoryItems.filter((item) =>
        successfulKeys.has(getMutationHistoryItemKey(item))
      );
      const totalCount = result?.summary?.total ?? items.length;

      if (successfulItems.length > 0) {
        pushMutationHistoryEntry(
          {
            items: successfulItems,
            operation: "move",
          },
          totalCount
        );
      } else {
        toast.error("Unable to move the selected items.");
      }

      await refreshExplorerView({ clearSelection: true });
    },
    [
      allFiles,
      allFolders,
      pushMutationHistoryEntry,
      refreshExplorerView,
      runBulkMutation,
    ]
  );

  const duplicateItem = useCallback(
    async (
      item:
        | { id: string; kind: "file"; parentId?: string | null }
        | { id: string; kind: "folder"; parentId?: string | null }
    ) => {
      if (!workspaceUuid) {
        return;
      }

      const duplicated = await duplicateExplorerItemTransport({
        item,
        workspaceUuid,
      });

      if (!duplicated) {
        return;
      }

      await refreshExplorerView();
    },
    [refreshExplorerView, workspaceUuid]
  );

  const duplicateSelectionItems = useCallback(
    async (items: BulkActionItem[]) => {
      if (!workspaceUuid) {
        return;
      }

      const writableItems = filterWritableBulkActionItems({
        files: allFiles,
        folders: allFolders,
        items,
      });

      if (writableItems.length === 0) {
        return;
      }

      let succeeded = 0;

      for (const item of writableItems) {
        if (
          await duplicateExplorerItemTransport({
            item,
            workspaceUuid,
          })
        ) {
          succeeded += 1;
        }
      }

      if (succeeded === 0) {
        return;
      }

      await refreshExplorerView();
    },
    [allFiles, allFolders, refreshExplorerView, workspaceUuid]
  );

  const hardReingestSelectionItems = useCallback(
    async (items: BulkActionItem[]) => {
      if (!workspaceUuid) {
        return;
      }

      const filesToReingest = filterWritableBulkActionItems({
        files: allFiles,
        folders: allFolders,
        items,
      })
        .filter((item) => item.kind === "file")
        .map((item) => allFiles.find((entry) => entry.id === item.id))
        .filter((file): file is FileRecord => Boolean(file));

      if (filesToReingest.length === 0) {
        return;
      }

      let succeeded = 0;

      for (const file of filesToReingest) {
        const result = await queueExplorerHardReingestTransport({
          fileId: file.id,
          workspaceUuid,
        });

        if (!result.ok) {
          toast.error(result.error);
          continue;
        }

        succeeded += 1;
      }

      if (succeeded === 0) {
        return;
      }

      toast.success(
        succeeded === 1
          ? "File queued for hard re-ingestion."
          : `${succeeded} files queued for hard re-ingestion.`
      );
      await refreshExplorerView({ silentFolder: true });
    },
    [allFiles, allFolders, refreshExplorerView, workspaceUuid]
  );

  const deleteContextActionItems = useCallback(
    (itemId: string, fallbackKind: BulkItemKind) => {
      const items = getContextActionItems(itemId, fallbackKind);
      void deleteSelectionItems(items);
    },
    [deleteSelectionItems, getContextActionItems]
  );

  const duplicateContextActionItems = useCallback(
    (itemId: string, fallbackKind: BulkItemKind) => {
      const items = getContextActionItems(itemId, fallbackKind);
      void duplicateSelectionItems(items);
    },
    [duplicateSelectionItems, getContextActionItems]
  );

  const moveContextActionItemsToFolder = useCallback(
    (itemId: string, fallbackKind: BulkItemKind, targetFolderId: string) => {
      const items = getContextActionItems(itemId, fallbackKind);
      void moveItemsToFolder(
        items.map((item) => item.id),
        targetFolderId
      );
    },
    [getContextActionItems, moveItemsToFolder]
  );

  const downloadContextActionItems = useCallback(
    (itemId: string, fallbackKind: BulkItemKind, fallbackName: string) => {
      const items = getContextActionItems(itemId, fallbackKind);
      void downloadSelectionArchive(items, fallbackName);
    },
    [downloadSelectionArchive, getContextActionItems]
  );

  const hardReingestContextActionItems = useCallback(
    (itemId: string) => {
      const items = getContextActionItems(itemId, "file");
      void hardReingestSelectionItems(items);
    },
    [getContextActionItems, hardReingestSelectionItems]
  );

  return {
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
  };
}
