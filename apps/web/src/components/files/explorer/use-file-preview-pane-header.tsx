"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { ExplorerSurfaceInfoEntry } from "@/components/files/explorer/explorer-surface-summary-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { usePaneHeaderActions } from "@/stores/header-store";
import {
  FilePreviewPaneHeaderActions,
  FilePreviewPaneHeaderBreadcrumbs,
  FilePreviewPaneHeaderLeadingIcon,
} from "./file-preview-pane-header-content";
import { canUseFilePreviewPaneCircleToAi } from "./file-preview-pane-header-model";

interface UseFilePreviewPaneHeaderOptions {
  activeCustomIcon: string | null;
  activeFile: FileRecord;
  activeFileIsMarkdown: boolean;
  activeFileSourceUrl: string;
  activeLinkSourceUrl: string | null;
  allFolders: FolderRecord[];
  canClosePane: boolean;
  circleToAiEnabled: boolean;
  circleToAiParam: string | null;
  closePane: (paneId: string) => void;
  currentInfoEntries: ExplorerSurfaceInfoEntry[];
  deleteContextActionItems: (itemId: string, kind: "file" | "folder") => void;
  downloadContextActionItems: (
    itemId: string,
    kind: "file" | "folder",
    fallbackName: string
  ) => void;
  duplicateContextActionItems: (
    itemId: string,
    kind: "file" | "folder"
  ) => void;
  hardReingestContextActionItems: (itemId: string) => void;
  isCurrentPinned: boolean;
  isImage: boolean;
  isPdf: boolean;
  isVideo: boolean;
  markdownDisplayTitle: string;
  moveContextActionItemsToFolder: (
    itemId: string,
    kind: "file" | "folder",
    targetFolderId: string
  ) => void;
  openFileShareDialog: (file: FileRecord) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: "horizontal" | "vertical";
      splitPlacement?: "after" | "before";
    }
  ) => void;
  openPropertiesDialog: () => void;
  openRenameFileDialog: (file: FileRecord) => void;
  paneId: string;
  pdfInvertColors: boolean;
  setCircleToAiEnabled: Dispatch<SetStateAction<boolean>>;
  setPdfInvertColors: Dispatch<SetStateAction<boolean>>;
  toggleCurrentPinnedItem: () => void;
}

export function useFilePreviewPaneHeader({
  activeCustomIcon,
  activeFile,
  activeFileIsMarkdown,
  activeFileSourceUrl,
  activeLinkSourceUrl,
  allFolders,
  canClosePane,
  circleToAiEnabled,
  circleToAiParam,
  closePane,
  currentInfoEntries,
  deleteContextActionItems,
  downloadContextActionItems,
  duplicateContextActionItems,
  hardReingestContextActionItems,
  isCurrentPinned,
  isImage,
  isPdf,
  isVideo,
  markdownDisplayTitle,
  moveContextActionItemsToFolder,
  openPropertiesDialog,
  openFileShareDialog,
  openPane,
  openRenameFileDialog,
  paneId,
  pdfInvertColors,
  setCircleToAiEnabled,
  setPdfInvertColors,
  toggleCurrentPinnedItem,
}: UseFilePreviewPaneHeaderOptions) {
  const { resetHeaderContext, setHeaderContext } = usePaneHeaderActions();

  useEffect(() => {
    if (
      circleToAiParam === "1" &&
      canUseFilePreviewPaneCircleToAi({
        isImage,
        isPdf,
        isVideo,
      })
    ) {
      setCircleToAiEnabled(true);
    }
  }, [circleToAiParam, isImage, isPdf, isVideo, setCircleToAiEnabled]);

  useEffect(() => {
    setHeaderContext({
      title: activeFileIsMarkdown ? markdownDisplayTitle : activeFile.name,
      leadingIcon: (
        <FilePreviewPaneHeaderLeadingIcon
          activeCustomIcon={activeCustomIcon}
          activeLinkSourceUrl={activeLinkSourceUrl}
        />
      ),
      breadcrumbs: (
        <FilePreviewPaneHeaderBreadcrumbs
          activeFileIsMarkdown={activeFileIsMarkdown}
          activeFileName={activeFile.name}
          markdownDisplayTitle={markdownDisplayTitle}
        />
      ),
      actions: (
        <FilePreviewPaneHeaderActions
          activeFile={activeFile}
          activeFileSourceUrl={activeFileSourceUrl}
          allFolders={allFolders}
          canClosePane={canClosePane}
          circleToAiEnabled={circleToAiEnabled}
          closePane={closePane}
          currentInfoEntries={currentInfoEntries}
          deleteContextActionItems={deleteContextActionItems}
          downloadContextActionItems={downloadContextActionItems}
          duplicateContextActionItems={duplicateContextActionItems}
          hardReingestContextActionItems={hardReingestContextActionItems}
          isCurrentPinned={isCurrentPinned}
          isImage={isImage}
          isPdf={isPdf}
          isVideo={isVideo}
          moveContextActionItemsToFolder={moveContextActionItemsToFolder}
          openFileShareDialog={openFileShareDialog}
          openPane={openPane}
          openPropertiesDialog={openPropertiesDialog}
          openRenameFileDialog={openRenameFileDialog}
          paneId={paneId}
          pdfInvertColors={pdfInvertColors}
          setCircleToAiEnabled={setCircleToAiEnabled}
          setPdfInvertColors={setPdfInvertColors}
          toggleCurrentPinnedItem={toggleCurrentPinnedItem}
        />
      ),
    });

    return () => {
      resetHeaderContext();
    };
  }, [
    activeCustomIcon,
    activeFile,
    activeFileIsMarkdown,
    activeFileSourceUrl,
    activeLinkSourceUrl,
    allFolders,
    canClosePane,
    circleToAiEnabled,
    closePane,
    currentInfoEntries,
    deleteContextActionItems,
    downloadContextActionItems,
    duplicateContextActionItems,
    hardReingestContextActionItems,
    isCurrentPinned,
    isImage,
    isPdf,
    isVideo,
    markdownDisplayTitle,
    moveContextActionItemsToFolder,
    openPropertiesDialog,
    openFileShareDialog,
    openPane,
    openRenameFileDialog,
    paneId,
    pdfInvertColors,
    resetHeaderContext,
    setCircleToAiEnabled,
    setHeaderContext,
    setPdfInvertColors,
    toggleCurrentPinnedItem,
  ]);
}
