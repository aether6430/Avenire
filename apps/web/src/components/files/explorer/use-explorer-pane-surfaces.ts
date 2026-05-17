"use client";

import { useCallback } from "react";
import { buildExplorerPaneSurfacesBrowseProps } from "@/components/files/explorer/explorer-pane-surfaces-browse-props";
import { buildExplorerPaneSurfacesPreviewProps } from "@/components/files/explorer/explorer-pane-surfaces-preview-props";
import { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import { useExplorerPaneHeader } from "@/components/files/explorer/use-explorer-pane-header";
import type { UseExplorerPaneSurfacesOptions } from "@/components/files/explorer/use-explorer-pane-surfaces-types";
import { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";
import { useExplorerWorkspaceIndexState } from "@/components/files/explorer/use-explorer-workspace-index-state";
import { filesPinsActions } from "@/stores/filesPinsStore";

export function useExplorerPaneSurfaces({
  activeFile,
  allFiles,
  allFolders,
  breadcrumbs,
  canClosePane,
  closePane,
  currentFolderId,
  derivedState,
  dragDrop,
  editWorkflows,
  fileInputRef,
  fileOperations,
  folderInputRef,
  focusSearchSignal,
  gridRef,
  isMobile,
  itemInteractions,
  itemRefs,
  listMeasureElement,
  listTotalSize,
  listVirtualItems,
  loading,
  navigation,
  noteWorkflows,
  openPane,
  paneId,
  propertyControls,
  setSortState,
  sortState,
  refreshCurrentFolder,
  scrollRef,
  searchSurface,
  selection,
  setPropertyDefinitions,
  shareDialogs,
  shell,
  startBannerUpload,
  triggerHapticSuccess,
  uiState,
  uploadWorkflows,
  workspaceUuid,
}: UseExplorerPaneSurfacesOptions) {
  const { filePathById, searchableItems, workspaceFileIndex } =
    useExplorerWorkspaceIndexState({
      allFiles,
      allFolders,
    });
  const filePresentation = useExplorerFilePresentation({
    workspaceFileIndex,
  });
  const surfaceSummary = useExplorerSurfaceSummary({
    activeFile,
    allFiles,
    allFolders,
    currentFolder: derivedState.currentFolder,
    currentLocationTitle: derivedState.currentLocationTitle,
    detectFileKind: filePresentation.detectFileKind,
    filePathById,
    isAtWorkspaceRoot: derivedState.isAtWorkspaceRoot,
    workspaceUuid,
  });
  const itemActionProps = useExplorerItemActionProps({
    allFolders,
    deleteContextActionItems: fileOperations.deleteContextActionItems,
    downloadContextActionItems: fileOperations.downloadContextActionItems,
    duplicateContextActionItems: fileOperations.duplicateContextActionItems,
    hardReingestContextActionItems:
      fileOperations.hardReingestContextActionItems,
    isPinned: (kind, itemId) =>
      Boolean(filesPinsActions.isPinned(workspaceUuid, kind, itemId)),
    moveContextActionItemsToFolder:
      fileOperations.moveContextActionItemsToFolder,
    onOpenPropertiesItem: uiState.openPropertiesItem,
    onSelectFile: navigation.selectFile,
    openFileShareDialog: shareDialogs.openFileShareDialog,
    openFolderShareDialog: shareDialogs.openFolderShareDialog,
    openRenameFileDialog: editWorkflows.openRenameFileDialog,
    openRenameFolderDialog: editWorkflows.openRenameFolderDialog,
    togglePinnedItem: (item) => {
      filesPinsActions.togglePinnedItem(workspaceUuid, item);
    },
    workspaceUuid,
  });
  const toggleCurrentPinnedItem = useCallback(() => {
    if (!(workspaceUuid && surfaceSummary.currentPinnedItem)) {
      return;
    }

    filesPinsActions.togglePinnedItem(
      workspaceUuid,
      surfaceSummary.currentPinnedItem
    );
  }, [surfaceSummary.currentPinnedItem, workspaceUuid]);

  const {
    deleteCurrentFolder,
    downloadCurrentFolder,
    duplicateCurrentFolder,
    moveCurrentFolderTo,
    openCurrentFolderProperties,
    openCurrentFolderRename,
    openPaneRight,
    shareCurrentFolder,
  } = useExplorerCurrentFolderActions({
    currentFolder: derivedState.currentFolder,
    deleteSelectionItems: fileOperations.deleteSelectionItems,
    downloadItemArchive: fileOperations.downloadItemArchive,
    duplicateItem: fileOperations.duplicateItem,
    moveFolder: fileOperations.moveFolder,
    openFolderShareDialog: shareDialogs.openFolderShareDialog,
    openPane,
    openRenameFolderDialog: editWorkflows.openRenameFolderDialog,
    paneId,
    setPropertiesItem: uiState.setPropertiesItem,
    setPropertiesOpen: uiState.setPropertiesOpen,
  });

  useExplorerPaneHeader({
    activeFile,
    allFolders,
    breadcrumbs,
    canClosePane,
    closePane,
    currentFolder: derivedState.currentFolder,
    currentInfoEntries: surfaceSummary.currentInfoEntries,
    currentLocationTitle: derivedState.currentLocationTitle,
    deleteCurrentFolder,
    downloadCurrentFolder,
    duplicateCurrentFolder,
    isAtWorkspaceRoot: derivedState.isAtWorkspaceRoot,
    isCurrentPinned: surfaceSummary.isCurrentPinned,
    menuSurfaceClass: "border border-border/60 shadow-md",
    moveCurrentFolderTo,
    navigateToFolder: navigation.navigateToFolder,
    openCurrentFolderProperties,
    openCurrentFolderRename,
    openCurrentFolderShare: shareCurrentFolder,
    openPaneRight,
    paneId,
    toggleCurrentPinnedItem,
  });

  const browsePaneProps = buildExplorerPaneSurfacesBrowseProps({
    allFolders,
    breadcrumbs,
    currentFolderId,
    derivedState,
    dragDrop,
    editWorkflows,
    fileInputRef,
    fileOperations,
    filePresentation,
    focusSearchSignal,
    folderInputRef,
    gridRef,
    isMobile,
    itemActionProps,
    itemInteractions,
    itemRefs,
    listMeasureElement,
    listTotalSize,
    listVirtualItems,
    loading,
    navigation,
    noteWorkflows,
    propertyControls,
    refreshCurrentFolder,
    scrollRef,
    searchSurface,
    searchableItems,
    selection,
    setSortState,
    shareDialogs,
    shell,
    sortState,
    surfaceSummary,
    triggerHapticSuccess,
    uiState,
    uploadWorkflows,
  });

  const previewPaneProps = buildExplorerPaneSurfacesPreviewProps({
    activeFile,
    allFiles,
    allFolders,
    fileOperations,
    filePreviewRetrievalProps: searchSurface.filePreviewRetrievalProps,
    navigation,
    openRenameFileDialog: editWorkflows.openRenameFileDialog,
    propertyDefinitions: propertyControls.availablePropertyDefinitions,
    setPropertyDefinitions,
    shareDialogs,
    startBannerUpload,
    surfaceSummary,
    toggleCurrentPinnedItem,
    wikiLinkableFiles: filePresentation.wikiLinkableFiles,
    workspaceUuid,
  });

  return {
    browsePaneProps,
    previewPaneProps,
  };
}
