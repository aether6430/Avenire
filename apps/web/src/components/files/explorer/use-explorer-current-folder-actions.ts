"use client";

import { type Dispatch, type SetStateAction, useCallback } from "react";
import type { ExplorerPropertiesItem } from "@/components/files/explorer/explorer-content-dialog-model";
import type { FolderRecord } from "@/components/files/explorer/shared";

interface UseExplorerCurrentFolderActionsOptions {
  currentFolder: FolderRecord | null;
  deleteSelectionItems: (
    items: Array<{ id: string; kind: "file" | "folder" }>
  ) => Promise<void>;
  downloadItemArchive: (item: {
    id: string;
    kind: "file" | "folder";
    name: string;
  }) => Promise<void>;
  duplicateItem: (item: {
    id: string;
    kind: "file" | "folder";
    parentId?: string | null;
  }) => Promise<void>;
  moveFolder: (folderId: string, targetFolderId: string) => Promise<void>;
  openFolderShareDialog: (folder: FolderRecord) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: "horizontal" | "vertical";
      splitPlacement?: "after" | "before";
    }
  ) => void;
  openRenameFolderDialog: (folder: FolderRecord) => void;
  paneId: string;
  setPropertiesItem: Dispatch<SetStateAction<ExplorerPropertiesItem | null>>;
  setPropertiesOpen: Dispatch<SetStateAction<boolean>>;
}

export function useExplorerCurrentFolderActions({
  currentFolder,
  deleteSelectionItems,
  downloadItemArchive,
  duplicateItem,
  moveFolder,
  openFolderShareDialog,
  openPane,
  openRenameFolderDialog,
  paneId,
  setPropertiesItem,
  setPropertiesOpen,
}: UseExplorerCurrentFolderActionsOptions) {
  const openCurrentFolderProperties = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    setPropertiesItem({
      detail: "Folder",
      id: currentFolder.id,
      kind: "folder",
      name: currentFolder.name,
    });
    setPropertiesOpen(true);
  }, [currentFolder, setPropertiesItem, setPropertiesOpen]);

  const openCurrentFolderRename = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    openRenameFolderDialog(currentFolder);
  }, [currentFolder, openRenameFolderDialog]);

  const duplicateCurrentFolder = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    void duplicateItem({
      id: currentFolder.id,
      kind: "folder",
      parentId: currentFolder.parentId,
    });
  }, [currentFolder, duplicateItem]);

  const shareCurrentFolder = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    openFolderShareDialog(currentFolder);
  }, [currentFolder, openFolderShareDialog]);

  const moveCurrentFolderTo = useCallback(
    (targetFolderId: string) => {
      if (!currentFolder) {
        return;
      }

      void moveFolder(currentFolder.id, targetFolderId);
    },
    [currentFolder, moveFolder]
  );

  const downloadCurrentFolder = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    void downloadItemArchive({
      id: currentFolder.id,
      kind: "folder",
      name: currentFolder.name,
    });
  }, [currentFolder, downloadItemArchive]);

  const deleteCurrentFolder = useCallback(() => {
    if (!currentFolder) {
      return;
    }

    void deleteSelectionItems([{ id: currentFolder.id, kind: "folder" }]);
  }, [currentFolder, deleteSelectionItems]);

  const openPaneRight = useCallback(() => {
    openPane("/workspace", {
      sourcePaneId: paneId,
      splitDirection: "horizontal",
      splitPlacement: "after",
    });
  }, [openPane, paneId]);

  return {
    deleteCurrentFolder,
    downloadCurrentFolder,
    duplicateCurrentFolder,
    moveCurrentFolderTo,
    openCurrentFolderProperties,
    openCurrentFolderRename,
    openPaneRight,
    shareCurrentFolder,
  };
}
