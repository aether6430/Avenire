"use client";

import { useCallback } from "react";
import type { ExplorerPropertiesItem } from "@/components/files/explorer/explorer-content-dialog-model";
import {
  buildExplorerFileActionDetail,
  buildExplorerFolderActionDetail,
  buildExplorerPropertiesItem,
} from "@/components/files/explorer/explorer-item-action-props-model";
import type { ExplorerItemActionsProps } from "@/components/files/explorer/explorer-item-actions";
import {
  detectPreviewKind,
  type FileRecord,
  type FolderRecord,
  formatBytes,
} from "@/components/files/explorer/shared";
import type { BulkItemKind } from "@/components/files/explorer/workspace-bulk-operations-model";

interface UseExplorerItemActionPropsOptions {
  allFolders: FolderRecord[];
  deleteContextActionItems: (itemId: string, kind: BulkItemKind) => void;
  downloadContextActionItems: (
    itemId: string,
    kind: BulkItemKind,
    fallbackName: string
  ) => void;
  duplicateContextActionItems: (itemId: string, kind: BulkItemKind) => void;
  hardReingestContextActionItems: (itemId: string) => void;
  isPinned: (kind: "file" | "folder", itemId: string) => boolean;
  moveContextActionItemsToFolder: (
    itemId: string,
    kind: BulkItemKind,
    targetFolderId: string
  ) => void;
  onOpenPropertiesItem: (item: ExplorerPropertiesItem) => void;
  onSelectFile: (
    fileId: string,
    options?: {
      retrievalChunkId?: string | null;
    }
  ) => void;
  openFileShareDialog: (file: FileRecord) => void;
  openFolderShareDialog: (folder: FolderRecord) => void;
  openRenameFileDialog: (file: FileRecord) => void;
  openRenameFolderDialog: (folder: FolderRecord) => void;
  togglePinnedItem: (item: {
    folderId: string | null;
    id: string;
    kind: "file" | "folder";
    name: string;
    workspaceId: string;
  }) => void;
  workspaceUuid: string;
}

export function useExplorerItemActionProps({
  allFolders,
  deleteContextActionItems,
  downloadContextActionItems,
  duplicateContextActionItems,
  hardReingestContextActionItems,
  moveContextActionItemsToFolder,
  onOpenPropertiesItem,
  onSelectFile,
  openFileShareDialog,
  openFolderShareDialog,
  openRenameFileDialog,
  openRenameFolderDialog,
  togglePinnedItem,
  workspaceUuid,
  isPinned,
}: UseExplorerItemActionPropsOptions) {
  const getFolderItemActionProps = useCallback(
    (
      folder: FolderRecord,
      counts: {
        fileCount: number;
        folderCount: number;
      }
    ): ExplorerItemActionsProps => ({
      detail: buildExplorerFolderActionDetail(counts),
      folders: allFolders,
      kind: "folder",
      name: folder.name,
      onDelete: () => {
        deleteContextActionItems(folder.id, "folder");
      },
      onDownload: () => {
        downloadContextActionItems(folder.id, "folder", folder.name);
      },
      onDuplicate: () => {
        duplicateContextActionItems(folder.id, "folder");
      },
      onMetadata: () => {
        onOpenPropertiesItem(
          buildExplorerPropertiesItem({
            detail: "Folder",
            id: folder.id,
            kind: "folder",
            name: folder.name,
          })
        );
      },
      onMoveTo: (targetId) => {
        moveContextActionItemsToFolder(folder.id, "folder", targetId);
      },
      onOpenProperties: () => {
        onOpenPropertiesItem(
          buildExplorerPropertiesItem({
            detail: "Folder",
            id: folder.id,
            kind: "folder",
            name: folder.name,
          })
        );
      },
      onRename: () => openRenameFolderDialog(folder),
      onShare: () => {
        openFolderShareDialog(folder);
      },
      onTogglePin: () => {
        togglePinnedItem({
          folderId: folder.parentId,
          id: folder.id,
          kind: "folder",
          name: folder.name,
          workspaceId: workspaceUuid,
        });
      },
      pinned: isPinned("folder", folder.id),
      readOnly: Boolean(folder.readOnly),
      targetId: folder.id,
    }),
    [
      allFolders,
      deleteContextActionItems,
      downloadContextActionItems,
      duplicateContextActionItems,
      isPinned,
      moveContextActionItemsToFolder,
      onOpenPropertiesItem,
      openFolderShareDialog,
      openRenameFolderDialog,
      togglePinnedItem,
      workspaceUuid,
    ]
  );

  const getFileItemActionProps = useCallback(
    (file: FileRecord): ExplorerItemActionsProps => {
      const previewKind = detectPreviewKind(file);
      const detail = buildExplorerFileActionDetail({
        isIngested: Boolean(file.isIngested),
        mimeType: file.mimeType ?? null,
        sizeLabel: formatBytes(file.sizeBytes),
      });

      return {
        detail,
        folders: allFolders,
        kind: "file",
        name: file.name,
        onDelete: () => {
          deleteContextActionItems(file.id, "file");
        },
        onDownload: () => {
          downloadContextActionItems(file.id, "file", file.name);
        },
        onDuplicate: () => {
          duplicateContextActionItems(file.id, "file");
        },
        onHardReingest: () => {
          hardReingestContextActionItems(file.id);
        },
        onMetadata: () => {
          onOpenPropertiesItem(
            buildExplorerPropertiesItem({
              detail,
              id: file.id,
              kind: "file",
              name: file.name,
            })
          );
        },
        onMoveTo: (targetId) => {
          moveContextActionItemsToFolder(file.id, "file", targetId);
        },
        onOpenProperties: () => {
          onOpenPropertiesItem(
            buildExplorerPropertiesItem({
              detail,
              id: file.id,
              kind: "file",
              name: file.name,
            })
          );
        },
        onRename: () => openRenameFileDialog(file),
        onShare: () => {
          openFileShareDialog(file);
        },
        onTogglePin: () => {
          togglePinnedItem({
            folderId: file.folderId,
            id: file.id,
            kind: "file",
            name: file.name,
            workspaceId: workspaceUuid,
          });
        },
        pinned: isPinned("file", file.id),
        readOnly: Boolean(file.readOnly),
        targetId: file.id,
      };
    },
    [
      allFolders,
      deleteContextActionItems,
      downloadContextActionItems,
      duplicateContextActionItems,
      hardReingestContextActionItems,
      isPinned,
      moveContextActionItemsToFolder,
      onOpenPropertiesItem,
      openFileShareDialog,
      openRenameFileDialog,
      togglePinnedItem,
      workspaceUuid,
    ]
  );

  return {
    getFileItemActionProps,
    getFolderItemActionProps,
  };
}
