"use client";

import { buildExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props";
import type { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import type { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import type { UseExplorerPaneSurfacesOptions } from "@/components/files/explorer/use-explorer-pane-surfaces-types";
import type { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";
import type { useExplorerWorkspaceIndexState } from "@/components/files/explorer/use-explorer-workspace-index-state";

interface BuildExplorerPaneSurfacesBrowsePropsOptions
  extends Pick<
    UseExplorerPaneSurfacesOptions,
    | "allFolders"
    | "breadcrumbs"
    | "currentFolderId"
    | "derivedState"
    | "dragDrop"
    | "editWorkflows"
    | "fileInputRef"
    | "fileOperations"
    | "focusSearchSignal"
    | "folderInputRef"
    | "gridRef"
    | "isMobile"
    | "itemInteractions"
    | "itemRefs"
    | "listMeasureElement"
    | "listTotalSize"
    | "listVirtualItems"
    | "loading"
    | "navigation"
    | "noteWorkflows"
    | "propertyControls"
    | "refreshCurrentFolder"
    | "scrollRef"
    | "searchSurface"
    | "selection"
    | "setSortState"
    | "shareDialogs"
    | "shell"
    | "sortState"
    | "triggerHapticSuccess"
    | "uiState"
    | "uploadWorkflows"
  > {
  filePresentation: ReturnType<typeof useExplorerFilePresentation>;
  itemActionProps: ReturnType<typeof useExplorerItemActionProps>;
  searchableItems: ReturnType<
    typeof useExplorerWorkspaceIndexState
  >["searchableItems"];
  surfaceSummary: ReturnType<typeof useExplorerSurfaceSummary>;
}

export function buildExplorerPaneSurfacesBrowseProps({
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
}: BuildExplorerPaneSurfacesBrowsePropsOptions) {
  const searchBarProps = searchSurface.getSearchBarProps({
    focusSearchSignal,
    onOpenFileById: navigation.openFileById,
    onOpenFolderById: navigation.openFolderById,
    searchableItems,
  });

  return buildExplorerBrowsePaneProps({
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
}
