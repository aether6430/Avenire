"use client";

import { useCallback } from "react";
import { buildExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props";
import { buildExplorerPreviewPaneProps } from "@/components/files/explorer/explorer-preview-pane-props";
import { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";
import type { useExplorerDerivedState } from "@/components/files/explorer/use-explorer-derived-state";
import type { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import type { useExplorerFileOperations } from "@/components/files/explorer/use-explorer-file-operations";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import type { useExplorerItemInteractions } from "@/components/files/explorer/use-explorer-item-interactions";
import type { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import type { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerPaneHeader } from "@/components/files/explorer/use-explorer-pane-header";
import type { useExplorerPropertyControls } from "@/components/files/explorer/use-explorer-property-controls";
import type { useExplorerSearchSurface } from "@/components/files/explorer/use-explorer-search-surface";
import type { useExplorerShareDialogs } from "@/components/files/explorer/use-explorer-share-dialogs";
import { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";
import type { useExplorerSurfaceUiState } from "@/components/files/explorer/use-explorer-surface-ui-state";
import type { useExplorerUploadWorkflows } from "@/components/files/explorer/use-explorer-upload-workflows";
import { useExplorerWorkspaceIndexState } from "@/components/files/explorer/use-explorer-workspace-index-state";
import type { useFileDragDrop } from "@/hooks/use-file-drag-drop";
import type { useFileSelection } from "@/hooks/use-file-selection";
import { filesPinsActions } from "@/stores/filesPinsStore";

interface UseExplorerPaneSurfacesOptions {
  activeFile: ReturnType<typeof useExplorerDerivedState>["activeFile"];
  allFiles: Parameters<typeof buildExplorerPreviewPaneProps>[0]["allFiles"];
  allFolders: Parameters<typeof buildExplorerBrowsePaneProps>[0]["allFolders"];
  breadcrumbs: Parameters<typeof useExplorerPaneHeader>[0]["breadcrumbs"];
  canClosePane: Parameters<typeof useExplorerPaneHeader>[0]["canClosePane"];
  closePane: Parameters<typeof useExplorerPaneHeader>[0]["closePane"];
  currentFolderId: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["currentFolderId"];
  derivedState: ReturnType<typeof useExplorerDerivedState>;
  dragDrop: ReturnType<typeof useFileDragDrop>;
  editWorkflows: ReturnType<typeof useExplorerEditWorkflows>;
  fileInputRef: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["fileInputRef"];
  fileOperations: ReturnType<typeof useExplorerFileOperations>;
  focusSearchSignal: number;
  folderInputRef: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["folderInputRef"];
  gridRef: Parameters<typeof buildExplorerBrowsePaneProps>[0]["gridRef"];
  isMobile: boolean;
  itemInteractions: ReturnType<typeof useExplorerItemInteractions>;
  itemRefs: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["setItemRowRefMap"];
  listMeasureElement: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listMeasureElement"];
  listTotalSize: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listTotalSize"];
  listVirtualItems: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listVirtualItems"];
  loading: Parameters<typeof buildExplorerBrowsePaneProps>[0]["loading"];
  navigation: ReturnType<typeof useExplorerNavigation>;
  noteWorkflows: ReturnType<typeof useExplorerNoteWorkflows>;
  openPane: Parameters<typeof useExplorerCurrentFolderActions>[0]["openPane"];
  paneId: Parameters<typeof useExplorerCurrentFolderActions>[0]["paneId"];
  propertyControls: ReturnType<typeof useExplorerPropertyControls>;
  refreshCurrentFolder: () => Promise<unknown>;
  scrollRef: Parameters<typeof buildExplorerBrowsePaneProps>[0]["scrollRef"];
  searchSurface: ReturnType<typeof useExplorerSearchSurface>;
  selection: ReturnType<typeof useFileSelection>;
  setPropertyDefinitions: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["setPropertyDefinitions"];
  setSortState: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["setSortState"];
  shareDialogs: ReturnType<typeof useExplorerShareDialogs>;
  shell: {
    setViewMode: Parameters<
      typeof buildExplorerBrowsePaneProps
    >[0]["setViewMode"];
    viewMode: Parameters<typeof buildExplorerBrowsePaneProps>[0]["viewMode"];
  };
  sortState: Parameters<typeof buildExplorerBrowsePaneProps>[0]["sortState"];
  startBannerUpload: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["startBannerUpload"];
  triggerHapticSuccess: () => void;
  uiState: ReturnType<typeof useExplorerSurfaceUiState>;
  uploadWorkflows: ReturnType<typeof useExplorerUploadWorkflows>;
  workspaceUuid: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["workspaceUuid"];
}

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

  const searchBarProps = searchSurface.getSearchBarProps({
    focusSearchSignal,
    onOpenFileById: navigation.openFileById,
    onOpenFolderById: navigation.openFolderById,
    searchableItems,
  });

  const browsePaneProps = buildExplorerBrowsePaneProps({
    allFolders,
    availablePropertyDefinitions: propertyControls.availablePropertyDefinitions,
    bannerInputRef: editWorkflows.bannerInputRef,
    bannerUploadBusy: editWorkflows.bannerUploadBusy,
    canMoveSelectionUp: Boolean(breadcrumbs.at(-2)?.id),
    canNavigateUp:
      !derivedState.isAtWorkspaceRoot && Boolean(derivedState.parentFolder),
    canvasDropActive: dragDrop.canvasDropActive,
    canvasDropProps: dragDrop.getCanvasDropProps(),
    canRedoFileOperation: fileOperations.canRedoFileOperation,
    canUndoFileOperation: fileOperations.canUndoFileOperation,
    cardFieldQuery: propertyControls.cardFieldQuery,
    cardPropertyKeys: propertyControls.cardPropertyKeys,
    clearSelection: () => selection.clearSelection(),
    contextMenuSurfaceClass: "border border-border/60 shadow-md",
    currentFolder: derivedState.currentFolder,
    currentFolderBannerUrl: derivedState.currentFolderBannerUrl,
    currentFolderId,
    currentLocationTitle: derivedState.currentLocationTitle,
    deleteSelectionItems: fileOperations.deleteSelectionItems,
    downloadStatus: fileOperations.downloadStatus,
    dropTargetId: dragDrop.dropTargetId,
    editDialog: editWorkflows.editDialog,
    explorerEntries: derivedState.explorerEntries,
    fileInputRef,
    fileOperationHistoryBusy: fileOperations.fileOperationHistoryBusy,
    fileShareDialogProps: shareDialogs.fileShareDialogProps,
    filteredAvailablePropertyDefinitions:
      propertyControls.filteredAvailablePropertyDefinitions,
    folderFileCount: surfaceSummary.folderFileCount,
    folderInputRef,
    folderPreviewKinds: surfaceSummary.folderPreviewKinds,
    folderShareDialogProps: shareDialogs.folderShareDialogProps,
    folderSubfolderCount: surfaceSummary.folderSubfolderCount,
    getFileDragProps: dragDrop.getFileDragProps,
    getFileIcon: filePresentation.getFileVisualIcon,
    getFileItemActionProps: itemActionProps.getFileItemActionProps,
    getFileKind: filePresentation.detectFileKind,
    getFolderDragProps: dragDrop.getFolderDragProps,
    getFolderItemActionProps: itemActionProps.getFolderItemActionProps,
    getSelectedActionItems: fileOperations.getSelectedActionItems,
    gridRef,
    handleApplyEditDialog: () => {
      void editWorkflows.applyEditDialog();
    },
    handleEditDialogOpenChange: editWorkflows.handleEditDialogOpenChange,
    handleEditDialogValueChange: editWorkflows.handleEditDialogValueChange,
    handlePropertyFiltersChange: propertyControls.handlePropertyFiltersChange,
    hoveredPreviewFileId: filePresentation.hoveredPreviewFileId,
    interactions: {
      beginMobileItemLongPress: itemInteractions.beginMobileItemLongPress,
      handleItemContextMenu: itemInteractions.handleItemContextMenu,
      handleMobileItemClick: itemInteractions.handleMobileItemClick,
      handleMobileItemPointerUp: itemInteractions.handleMobileItemPointerUp,
      handleOpenOnDoubleClick: itemInteractions.handleOpenOnDoubleClick,
      shouldIgnoreItemClick: itemInteractions.shouldIgnoreItemClick,
      stopItemSelectionEvent: itemInteractions.stopItemSelectionEvent,
    },
    isCurrentFolderReadOnly: derivedState.isCurrentFolderReadOnly,
    isMobile,
    itemActionTargetSelector:
      "[data-item-actions='true'], [data-selection-control='true'], button, a, input, textarea, select, label",
    listMeasureElement,
    listTotalSize,
    listVirtualItems,
    loading,
    mobileConfirmAction: uiState.mobileConfirmAction,
    mobileCreateMenuOpen: uiState.mobileCreateMenuOpen,
    moveItemsToFolder: fileOperations.moveItemsToFolder,
    moveSelectionTargetFolderId: breadcrumbs.at(-2)?.id ?? null,
    noteWorkflowContentDialogProps: noteWorkflows.contentDialogProps,
    onBannerInputChange: editWorkflows.handleBannerInputChange,
    onChangeFolderBanner: editWorkflows.triggerBannerPicker,
    onCreateFolder: editWorkflows.openCreateFolderDialog,
    onCreateNote: editWorkflows.openCreateNoteDialog,
    onImportLink: noteWorkflows.openImportLinkDialog,
    onMobileCanvasPointerDown: itemInteractions.handleMobileCanvasPointerDown,
    onNavigateUp: () => {
      if (derivedState.parentFolder) {
        navigation.navigateToFolder(derivedState.parentFolder.id);
      }
    },
    onOpenFile: navigation.selectFile,
    onOpenFolder: navigation.navigateToFolder,
    onOpenMobileCreateMenu: uiState.openMobileCreateMenu,
    onPreviewIntentEnd: filePresentation.handlePreviewIntentEnd,
    onPreviewIntentStart: filePresentation.handlePreviewIntentStart,
    onQueueFiles: (files) => {
      uploadWorkflows.queueUploads(files.map((file) => ({ file })));
    },
    onQueueFolderFiles: (incoming) => {
      uploadWorkflows.queueUploads(incoming);
    },
    onRedo: () => {
      void fileOperations.redoLatestFileOperation();
    },
    onRefresh: () => {
      void refreshCurrentFolder();
    },
    onResetFolderBanner: (folderId) => {
      void editWorkflows.resetFolderBanner(folderId);
    },
    onUndo: () => {
      void fileOperations.undoLatestFileOperation();
    },
    onUploadFile: () => fileInputRef.current?.click(),
    onUploadFolder: () => folderInputRef.current?.click(),
    onCardFieldQueryChange: propertyControls.handleCardFieldQueryChange,
    onCardFieldToggle: propertyControls.handleCardFieldToggle,
    onClearCardFields: propertyControls.clearCardFields,
    onResetCardFields: propertyControls.resetCardFields,
    propertiesItem: uiState.propertiesItem,
    propertiesOpen: uiState.propertiesOpen,
    propertyFilterFields: propertyControls.propertyFilterFields,
    propertyFiltersForUi: propertyControls.propertyFiltersForUi,
    scrollRef,
    searchBarProps,
    selectedCardPropertyDefinitions:
      propertyControls.selectedCardPropertyDefinitions,
    selectedCount: selection.selectedCount,
    selectedIds: selection.getSelectedIds(),
    selection,
    selectionRect: selection.selectionRect,
    setItemRowRefMap: itemRefs,
    setMobileConfirmAction: uiState.setMobileConfirmAction,
    setMobileCreateMenuOpen: uiState.setMobileCreateMenuOpen,
    setPropertiesOpen: uiState.setPropertiesOpen,
    setSortState,
    setViewMode: shell.setViewMode,
    sortState,
    sortedFiles: derivedState.sortedFiles,
    sortedFolders: derivedState.sortedFolders,
    startHapticSuccess: triggerHapticSuccess,
    viewMode: shell.viewMode,
    visibleItemIds: derivedState.visibleItemIds,
  });

  const previewPaneProps = activeFile
    ? buildExplorerPreviewPaneProps({
        activeFile,
        allFiles,
        allFolders,
        currentInfoEntries: surfaceSummary.currentInfoEntries,
        deleteContextActionItems: fileOperations.deleteContextActionItems,
        downloadContextActionItems: fileOperations.downloadContextActionItems,
        duplicateContextActionItems: fileOperations.duplicateContextActionItems,
        fileShareDialogProps: shareDialogs.fileShareDialogProps,
        filePreviewRetrievalProps: searchSurface.filePreviewRetrievalProps,
        folderShareDialogProps: shareDialogs.folderShareDialogProps,
        hardReingestContextActionItems:
          fileOperations.hardReingestContextActionItems,
        isCurrentPinned: surfaceSummary.isCurrentPinned,
        moveContextActionItemsToFolder:
          fileOperations.moveContextActionItemsToFolder,
        openFileById: navigation.openFileById,
        openFileShareDialog: shareDialogs.openFileShareDialog,
        openRenameFileDialog: editWorkflows.openRenameFileDialog,
        propertyDefinitions: propertyControls.availablePropertyDefinitions,
        setPropertyDefinitions,
        startBannerUpload,
        toggleCurrentPinnedItem,
        wikiLinkableFiles: filePresentation.wikiLinkableFiles,
        workspaceUuid,
      })
    : null;

  return {
    browsePaneProps,
    previewPaneProps,
  };
}
