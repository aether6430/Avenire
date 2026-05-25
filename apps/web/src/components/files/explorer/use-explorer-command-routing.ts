"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { useFileSelection } from "@/hooks/use-file-selection";
import { useFilesUiStore } from "@/stores/filesUiStore";

const WORKSPACE_FILE_OPEN_EVENT = "workspace.file.open";

interface UseExplorerCommandRoutingOptions {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  breadcrumbs: FolderRecord[];
  currentFolderId: string;
  deleteSelectionItems: (
    items: Array<{ id: string; kind: "file" | "folder" }>
  ) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  getSelectedActionItems: () => Array<{ id: string; kind: "file" | "folder" }>;
  moveItemsToFolder: (
    itemIds: string[],
    targetFolderId: string
  ) => Promise<void>;
  navigateToFolder: (folderId: string) => void;
  openCreateFolderDialog: (parentId: string) => void;
  openCreateNoteDialog: (parentId: string) => void;
  openFileById: (fileId: string) => void;
  openImportLinkDialog: (parentId: string) => void;
  redoLatestFileOperation: () => Promise<void>;
  selection: ReturnType<typeof useFileSelection>;
  undoLatestFileOperation: () => Promise<void>;
  visibleItemIds: string[];
}

export function useExplorerCommandRouting({
  allFiles,
  allFolders,
  breadcrumbs,
  currentFolderId,
  deleteSelectionItems,
  fileInputRef,
  folderInputRef,
  getSelectedActionItems,
  moveItemsToFolder,
  navigateToFolder,
  openCreateFolderDialog,
  openCreateNoteDialog,
  openFileById,
  openImportLinkDialog,
  redoLatestFileOperation,
  selection,
  undoLatestFileOperation,
  visibleItemIds,
}: UseExplorerCommandRoutingOptions) {
  const [focusSearchSignal, setFocusSearchSignal] = useState(0);
  const focusSearchIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.focusSearch
  );
  const newNoteIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.newNote
  );
  const importLinkIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.importLink
  );
  const uploadFileIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.uploadFile
  );
  const uploadFolderIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.uploadFolder
  );
  const createFolderIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.createFolder
  );
  const openSelectionIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.openSelection
  );
  const deleteSelectionIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.deleteSelection
  );
  const moveSelectionUpIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.moveSelectionUp
  );
  const goParentIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.goParent
  );
  const undoMutationIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.undoMutation
  );
  const redoMutationIntentVersion = useFilesUiStore(
    (state) => state.intentVersion.redoMutation
  );
  const processedFilesIntentVersionsRef = useRef({
    createFolder: 0,
    deleteSelection: 0,
    focusSearch: 0,
    goParent: 0,
    importLink: 0,
    moveSelectionUp: 0,
    newNote: 0,
    openSelection: 0,
    redoMutation: 0,
    undoMutation: 0,
    uploadFile: 0,
    uploadFolder: 0,
  });

  useEffect(() => {
    const processed = processedFilesIntentVersionsRef.current;

    if (focusSearchIntentVersion > processed.focusSearch) {
      processed.focusSearch = focusSearchIntentVersion;
      setFocusSearchSignal((previous) => previous + 1);
    }

    if (newNoteIntentVersion > processed.newNote) {
      processed.newNote = newNoteIntentVersion;
      openCreateNoteDialog(currentFolderId);
    }

    if (importLinkIntentVersion > processed.importLink) {
      processed.importLink = importLinkIntentVersion;
      openImportLinkDialog(currentFolderId);
    }

    if (uploadFileIntentVersion > processed.uploadFile) {
      processed.uploadFile = uploadFileIntentVersion;
      fileInputRef.current?.click();
    }

    if (uploadFolderIntentVersion > processed.uploadFolder) {
      processed.uploadFolder = uploadFolderIntentVersion;
      folderInputRef.current?.click();
    }

    if (createFolderIntentVersion > processed.createFolder) {
      processed.createFolder = createFolderIntentVersion;
      openCreateFolderDialog(currentFolderId);
    }
  }, [
    createFolderIntentVersion,
    currentFolderId,
    fileInputRef,
    focusSearchIntentVersion,
    folderInputRef,
    importLinkIntentVersion,
    newNoteIntentVersion,
    openCreateFolderDialog,
    openCreateNoteDialog,
    openImportLinkDialog,
    uploadFileIntentVersion,
    uploadFolderIntentVersion,
  ]);

  useEffect(() => {
    const onOpenWorkspaceFile = (event: Event) => {
      const detail = (event as CustomEvent<{ fileId?: string }>).detail;
      const fileId = typeof detail?.fileId === "string" ? detail.fileId : "";
      if (!fileId) {
        return;
      }
      openFileById(fileId);
    };

    window.addEventListener(WORKSPACE_FILE_OPEN_EVENT, onOpenWorkspaceFile);
    return () => {
      window.removeEventListener(
        WORKSPACE_FILE_OPEN_EVENT,
        onOpenWorkspaceFile
      );
    };
  }, [openFileById]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const selectedIds = selection.getSelectedIds();
        const orderedSelection = visibleItemIds.filter((id) =>
          selectedIds.has(id)
        );
        if (orderedSelection.length === 1) {
          event.preventDefault();
          const selectedId = orderedSelection[0];
          const folder = allFolders.find((entry) => entry.id === selectedId);
          if (folder) {
            navigateToFolder(folder.id);
            return;
          }
          const file = allFiles.find((entry) => entry.id === selectedId);
          if (file) {
            openFileById(file.id);
            return;
          }
        }
      }

      const key = event.key.toLowerCase();
      const isSearchShortcut =
        (!(event.metaKey || event.ctrlKey || event.altKey) && key === "/") ||
        ((event.metaKey || event.ctrlKey) && !event.altKey && key === "k");

      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();
      setFocusSearchSignal((value) => value + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    allFiles,
    allFolders,
    navigateToFolder,
    openFileById,
    selection,
    visibleItemIds,
  ]);

  useEffect(() => {
    const processed = processedFilesIntentVersionsRef.current;

    const openSelectedItem = () => {
      const orderedSelection = visibleItemIds.filter((id) =>
        selection.getSelectedIds().has(id)
      );
      const firstSelectedId = orderedSelection[0];
      if (!firstSelectedId) {
        return;
      }
      const folder = allFolders.find((entry) => entry.id === firstSelectedId);
      if (folder) {
        navigateToFolder(folder.id);
        return;
      }
      const file = allFiles.find((entry) => entry.id === firstSelectedId);
      if (file) {
        openFileById(file.id);
      }
    };

    const deleteSelectedItems = () => {
      const items = getSelectedActionItems();
      if (items.length === 0) {
        return;
      }
      void deleteSelectionItems(items);
    };

    const moveSelectedItemsUp = () => {
      const parentFolderId = breadcrumbs.at(-2)?.id;
      if (!parentFolderId) {
        return;
      }
      const selectedIds = Array.from(selection.getSelectedIds());
      if (selectedIds.length === 0) {
        return;
      }
      void moveItemsToFolder(selectedIds, parentFolderId);
    };

    const goParentFolder = () => {
      const parentFolderId = breadcrumbs.at(-2)?.id;
      if (!parentFolderId) {
        return;
      }
      navigateToFolder(parentFolderId);
    };

    if (openSelectionIntentVersion > processed.openSelection) {
      processed.openSelection = openSelectionIntentVersion;
      openSelectedItem();
    }

    if (deleteSelectionIntentVersion > processed.deleteSelection) {
      processed.deleteSelection = deleteSelectionIntentVersion;
      deleteSelectedItems();
    }

    if (moveSelectionUpIntentVersion > processed.moveSelectionUp) {
      processed.moveSelectionUp = moveSelectionUpIntentVersion;
      moveSelectedItemsUp();
    }

    if (goParentIntentVersion > processed.goParent) {
      processed.goParent = goParentIntentVersion;
      goParentFolder();
    }

    if (undoMutationIntentVersion > processed.undoMutation) {
      processed.undoMutation = undoMutationIntentVersion;
      void undoLatestFileOperation();
    }

    if (redoMutationIntentVersion > processed.redoMutation) {
      processed.redoMutation = redoMutationIntentVersion;
      void redoLatestFileOperation();
    }
  }, [
    allFiles,
    allFolders,
    breadcrumbs,
    deleteSelectionIntentVersion,
    deleteSelectionItems,
    getSelectedActionItems,
    goParentIntentVersion,
    moveItemsToFolder,
    moveSelectionUpIntentVersion,
    navigateToFolder,
    openFileById,
    openSelectionIntentVersion,
    redoLatestFileOperation,
    redoMutationIntentVersion,
    selection,
    undoLatestFileOperation,
    undoMutationIntentVersion,
    visibleItemIds,
  ]);

  return {
    focusSearchSignal,
  };
}
