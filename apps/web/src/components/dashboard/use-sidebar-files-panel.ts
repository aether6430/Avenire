"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterSidebarTreeBySearchQuery,
  getSidebarFilesTreeState,
} from "@/components/dashboard/sidebar-files-panel-model";
import { useSidebarFilesPanelMutations } from "@/components/dashboard/use-sidebar-files-panel-mutations";
import { useSidebarFilesPanelNavigation } from "@/components/dashboard/use-sidebar-files-panel-navigation";
import { useSidebarFilesPanelTree } from "@/components/dashboard/use-sidebar-files-panel-tree";
import { useHaptics } from "@/hooks/use-haptics";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { useFilesPinsStore } from "@/stores/filesPinsStore";
import { type FilesUiIntent, filesUiActions } from "@/stores/filesUiStore";

export function useSidebarFilesPanel({
  currentFileId,
  currentFolderId,
  emitGlobalFileIntent,
  navigateToFilesRoot,
  workspaceUuid,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  emitGlobalFileIntent?: (intent: FilesUiIntent) => Promise<void> | void;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  workspaceUuid: string | null;
}) {
  const triggerHaptic = useHaptics();
  const pinnedByWorkspace = useFilesPinsStore(
    (state) => state.pinnedByWorkspace
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const tree = useSidebarFilesPanelTree({
    currentFileId,
    currentFolderId,
    workspaceUuid,
  });
  const navigation = useSidebarFilesPanelNavigation();
  const mutations = useSidebarFilesPanelMutations({
    currentFileId,
    currentFolderId,
    fileTree: tree.fileTree,
    folderTree: tree.folderTree,
    navigateToFilesRoot,
    setFileTree: tree.setFileTree,
    setFolderTree: tree.setFolderTree,
    workspaceUuid,
  });

  const filteredTree = useMemo(
    () =>
      filterSidebarTreeBySearchQuery({
        fileTree: tree.fileTree,
        folderTree: tree.folderTree,
        searchQuery,
      }),
    [searchQuery, tree.fileTree, tree.folderTree]
  );
  const selectedItemId = currentFileId ?? currentFolderId;
  const filesTreeState = getSidebarFilesTreeState({
    errorMessage: tree.errorMessage,
    filteredFolderCount: filteredTree.folders.length,
    folderCount: tree.folderTree.length,
    loadFailed: tree.loadFailed,
    loading: tree.loading,
    searchActive: Boolean(searchQuery.trim()),
    workspaceUuid,
  });
  const pinnedItems = useMemo(
    () => (workspaceUuid ? (pinnedByWorkspace[workspaceUuid] ?? []) : []),
    [pinnedByWorkspace, workspaceUuid]
  );

  useEffect(() => {
    commandPaletteActions.setFileIndex({
      workspaceUuid,
      folders: tree.folderTree,
      files: tree.fileTree,
      rootFolderId: tree.rootFolderId ?? null,
    });
  }, [tree.fileTree, tree.folderTree, tree.rootFolderId, workspaceUuid]);

  const pinnedFolders = useMemo(
    () =>
      pinnedItems.filter(
        (item) =>
          item.kind === "folder" &&
          filteredTree.folders.some((folder) => folder.id === item.id)
      ),
    [filteredTree.folders, pinnedItems]
  );
  const pinnedFiles = useMemo(
    () =>
      pinnedItems.filter(
        (item) =>
          item.kind === "file" &&
          filteredTree.files.some((file) => file.id === item.id)
      ),
    [filteredTree.files, pinnedItems]
  );

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((current) => {
      if (current) {
        setSearchQuery("");
        return false;
      }

      return true;
    });
  }, []);

  const emitFileIntentAfterNavigation = useCallback(
    (intent: FilesUiIntent) => {
      if (workspaceUuid && currentFolderId) {
        navigation.navigateToFolder(currentFolderId, workspaceUuid);
        window.setTimeout(() => {
          filesUiActions.emitIntent(intent);
        }, 0);
        triggerHaptic("selection");
        return;
      }

      if (emitGlobalFileIntent) {
        void emitGlobalFileIntent(intent);
        triggerHaptic("selection");
        return;
      }

      window.setTimeout(() => {
        filesUiActions.emitIntent(intent);
      }, 0);
      triggerHaptic("selection");
    },
    [
      currentFolderId,
      emitGlobalFileIntent,
      navigation,
      triggerHaptic,
      workspaceUuid,
    ]
  );

  const createNewNote = useCallback(() => {
    emitFileIntentAfterNavigation("newNote");
  }, [emitFileIntentAfterNavigation]);

  const importLink = useCallback(() => {
    emitFileIntentAfterNavigation("importLink");
  }, [emitFileIntentAfterNavigation]);

  const uploadFile = useCallback(() => {
    emitFileIntentAfterNavigation("uploadFile");
  }, [emitFileIntentAfterNavigation]);

  return {
    createNewNote,
    currentFileId,
    currentFolderId,
    deleteTreeItems: mutations.deleteTreeItems,
    expandedTreePathIds: tree.expandedTreePathIds,
    fileTree: filteredTree.files,
    fileTreePanelRef: tree.fileTreePanelRef,
    filesTreeLabel: filesTreeState.label,
    folderTree: filteredTree.folders,
    handlePaneIntent: navigation.handlePaneIntent,
    handleTreeMoveItem: mutations.handleTreeMoveItem,
    importLink,
    isSearchOpen,
    navigateToFile: navigation.navigateToFile,
    navigateToFilesRoot,
    navigateToFolder: navigation.navigateToFolder,
    onExpandedChange: tree.onExpandedChange,
    searchQuery,
    openFileInNewPane: navigation.openFileInNewPane,
    openFolderInNewPane: navigation.openFolderInNewPane,
    pinnedFiles,
    pinnedFolders,
    setSearchQuery,
    selectedItemId,
    toggleSearch,
    uploadFile,
    workspaceUuid,
  };
}
