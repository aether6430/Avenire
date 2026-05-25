"use client";

import { buildExplorerPreviewPaneProps } from "@/components/files/explorer/explorer-preview-pane-props";
import type { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import type { UseExplorerPaneSurfacesOptions } from "@/components/files/explorer/use-explorer-pane-surfaces-types";
import type { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";

interface BuildExplorerPaneSurfacesPreviewPropsOptions
  extends Pick<
    UseExplorerPaneSurfacesOptions,
    | "activeFile"
    | "allFiles"
    | "allFolders"
    | "fileOperations"
    | "navigation"
    | "setPropertyDefinitions"
    | "shareDialogs"
    | "startBannerUpload"
    | "workspaceUuid"
  > {
  filePreviewRetrievalProps: UseExplorerPaneSurfacesOptions["searchSurface"]["filePreviewRetrievalProps"];
  openRenameFileDialog: UseExplorerPaneSurfacesOptions["editWorkflows"]["openRenameFileDialog"];
  propertyDefinitions: UseExplorerPaneSurfacesOptions["propertyControls"]["availablePropertyDefinitions"];
  surfaceSummary: ReturnType<typeof useExplorerSurfaceSummary>;
  toggleCurrentPinnedItem: () => void;
  wikiLinkableFiles: ReturnType<
    typeof useExplorerFilePresentation
  >["wikiLinkableFiles"];
}

export function buildExplorerPaneSurfacesPreviewProps({
  activeFile,
  allFiles,
  allFolders,
  fileOperations,
  filePreviewRetrievalProps,
  navigation,
  openRenameFileDialog,
  propertyDefinitions,
  setPropertyDefinitions,
  shareDialogs,
  startBannerUpload,
  surfaceSummary,
  toggleCurrentPinnedItem,
  wikiLinkableFiles,
  workspaceUuid,
}: BuildExplorerPaneSurfacesPreviewPropsOptions) {
  if (!activeFile) {
    return null;
  }

  return buildExplorerPreviewPaneProps({
    activeFile,
    allFiles,
    allFolders,
    currentInfoEntries: surfaceSummary.currentInfoEntries,
    deleteContextActionItems: fileOperations.deleteContextActionItems,
    downloadContextActionItems: fileOperations.downloadContextActionItems,
    duplicateContextActionItems: fileOperations.duplicateContextActionItems,
    filePreviewRetrievalProps,
    fileShareDialogProps: shareDialogs.fileShareDialogProps,
    folderShareDialogProps: shareDialogs.folderShareDialogProps,
    hardReingestContextActionItems:
      fileOperations.hardReingestContextActionItems,
    isCurrentPinned: surfaceSummary.isCurrentPinned,
    moveContextActionItemsToFolder:
      fileOperations.moveContextActionItemsToFolder,
    openFileById: navigation.openFileById,
    openFileShareDialog: shareDialogs.openFileShareDialog,
    openRenameFileDialog,
    propertyDefinitions,
    setPropertyDefinitions,
    startBannerUpload,
    toggleCurrentPinnedItem,
    wikiLinkableFiles,
    workspaceUuid,
  });
}
