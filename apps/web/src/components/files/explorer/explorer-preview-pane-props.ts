import type { ComponentProps } from "react";
import type { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";
import type { ExplorerFilePreviewRetrievalProps } from "@/components/files/explorer/explorer-retrieval-props";

type ExplorerPreviewPaneProps = ComponentProps<typeof ExplorerPreviewPane>;
type FilePreviewPanelProps = ExplorerPreviewPaneProps["filePreviewPanelProps"];

interface BuildExplorerPreviewPanePropsOptions {
  activeFile: FilePreviewPanelProps["activeFile"];
  allFiles: FilePreviewPanelProps["allFiles"];
  allFolders: FilePreviewPanelProps["allFolders"];
  currentInfoEntries: FilePreviewPanelProps["currentInfoEntries"];
  deleteContextActionItems: FilePreviewPanelProps["deleteContextActionItems"];
  downloadContextActionItems: FilePreviewPanelProps["downloadContextActionItems"];
  duplicateContextActionItems: FilePreviewPanelProps["duplicateContextActionItems"];
  filePreviewRetrievalProps: ExplorerFilePreviewRetrievalProps;
  fileShareDialogProps: ExplorerPreviewPaneProps["fileShareDialogProps"];
  folderShareDialogProps: ExplorerPreviewPaneProps["folderShareDialogProps"];
  hardReingestContextActionItems: FilePreviewPanelProps["hardReingestContextActionItems"];
  isCurrentPinned: FilePreviewPanelProps["isCurrentPinned"];
  moveContextActionItemsToFolder: FilePreviewPanelProps["moveContextActionItemsToFolder"];
  openFileById: FilePreviewPanelProps["openFileById"];
  openFileShareDialog: FilePreviewPanelProps["openFileShareDialog"];
  openRenameFileDialog: FilePreviewPanelProps["openRenameFileDialog"];
  propertyDefinitions: FilePreviewPanelProps["propertyDefinitions"];
  setPropertyDefinitions: FilePreviewPanelProps["setPropertyDefinitions"];
  startBannerUpload: FilePreviewPanelProps["startBannerUpload"];
  toggleCurrentPinnedItem: FilePreviewPanelProps["toggleCurrentPinnedItem"];
  wikiLinkableFiles: FilePreviewPanelProps["wikiLinkableFiles"];
  workspaceUuid: FilePreviewPanelProps["workspaceUuid"];
}

export function buildExplorerPreviewPaneProps({
  activeFile,
  allFiles,
  allFolders,
  currentInfoEntries,
  deleteContextActionItems,
  downloadContextActionItems,
  duplicateContextActionItems,
  fileShareDialogProps,
  filePreviewRetrievalProps,
  folderShareDialogProps,
  hardReingestContextActionItems,
  isCurrentPinned,
  moveContextActionItemsToFolder,
  openFileById,
  openFileShareDialog,
  openRenameFileDialog,
  propertyDefinitions,
  setPropertyDefinitions,
  startBannerUpload,
  toggleCurrentPinnedItem,
  wikiLinkableFiles,
  workspaceUuid,
}: BuildExplorerPreviewPanePropsOptions): ExplorerPreviewPaneProps {
  return {
    filePreviewPanelProps: {
      activeFile,
      allFiles,
      allFolders,
      currentInfoEntries,
      deleteContextActionItems,
      downloadContextActionItems,
      duplicateContextActionItems,
      hardReingestContextActionItems,
      isCurrentPinned,
      moveContextActionItemsToFolder,
      openFileById,
      openFileShareDialog,
      openRenameFileDialog,
      propertyDefinitions,
      ...filePreviewRetrievalProps,
      setPropertyDefinitions,
      startBannerUpload,
      toggleCurrentPinnedItem,
      wikiLinkableFiles,
      workspaceUuid,
    },
    fileShareDialogProps,
    folderShareDialogProps,
  };
}
