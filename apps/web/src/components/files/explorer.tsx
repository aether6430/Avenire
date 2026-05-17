"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import { Suspense, useCallback, useRef, useState } from "react";
import { ExplorerBrowsePane } from "@/components/files/explorer/explorer-browse-pane";
import { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";
import { useExplorerDerivedState } from "@/components/files/explorer/use-explorer-derived-state";
import { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerPaneSurfaces } from "@/components/files/explorer/use-explorer-pane-surfaces";
import { useExplorerPropertyControls } from "@/components/files/explorer/use-explorer-property-controls";
import { useExplorerRuntime } from "@/components/files/explorer/use-explorer-runtime";
import { useExplorerSearchSurface } from "@/components/files/explorer/use-explorer-search-surface";
import { useExplorerShareDialogs } from "@/components/files/explorer/use-explorer-share-dialogs";
import { useExplorerShell } from "@/components/files/explorer/use-explorer-shell";
import { useExplorerSurfaceUiState } from "@/components/files/explorer/use-explorer-surface-ui-state";
import { useWorkspaceExplorerData } from "@/components/files/explorer/use-workspace-explorer-data";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import { useUploadThing } from "@/lib/uploadthing";
import {
  useCurrentWorkspacePane,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { filesUiActions } from "@/stores/filesUiStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

interface FileExplorerProps {
  folderUuid?: string;
  workspaceUuid?: string;
}

export function FileExplorer({
  folderUuid: folderUuidFromPage,
  workspaceUuid: workspaceUuidFromPage,
}: FileExplorerProps = {}) {
  const router = usePaneRouter();
  const pathname = usePanePathname();
  const searchParams = usePaneSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const explorerScrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const contextActionIdsRef = useRef<{
    itemId: string;
    ids: string[];
  } | null>(null);
  const mobileLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const mobileSuppressClickRef = useRef<string | null>(null);
  const {
    canClosePane,
    currentFolderId,
    setViewMode,
    viewMode,
    workspaceName,
    workspaceUuid,
  } = useExplorerShell({
    folderInputRef,
    folderUuidFromPage,
    pathname,
    searchParams,
    workspaceUuidFromPage,
  });

  const [sortState, setSortState] = useState<SortState>({
    direction: "asc",
    key: "name",
    kind: "builtin",
  });
  const uiState = useExplorerSurfaceUiState();
  const {
    mobileConfirmAction,
    mobileCreateMenuOpen,
    openMobileCreateMenu,
    openPropertiesItem,
    propertiesItem,
    propertiesOpen,
    setMobileConfirmAction,
    setMobileCreateMenuOpen,
    setPropertiesItem,
    setPropertiesOpen,
  } = uiState;
  const { paneId } = useCurrentWorkspacePane();
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);

  const { startUpload: startBannerUpload } = useUploadThing("imageUploader");
  const {
    allFiles,
    allFolders,
    breadcrumbs,
    files,
    folders,
    loadFolder,
    loadTree,
    loading,
    propertyDefinitions,
    refreshData,
    refreshDataDebounced,
    setPropertyDefinitions,
  } = useWorkspaceExplorerData({
    currentFolderId,
    workspaceUuid,
  });

  const selectedFileParam = searchParams.get("file");
  const selectedRetrievalChunkParam = searchParams.get("retrievalChunk");
  const navigation = useExplorerNavigation({
    allFiles,
    currentFolderId,
    router,
    searchParams,
    workspaceUuid,
  });
  const {
    navigateToFolder,
    openFolderById,
    openSearchResult,
    openWorkspaceFileInFolder,
    selectFile,
  } = navigation;
  const searchSurface = useExplorerSearchSurface({
    onOpenFolderById: openFolderById,
    onOpenSearchResult: openSearchResult,
    selectedRetrievalChunkParam,
    workspaceUuid,
  });

  const propertyControls = useExplorerPropertyControls({
    allFiles,
    propertyDefinitions,
    workspaceUuid,
  });
  const { propertyFilters } = propertyControls;
  const derivedState = useExplorerDerivedState({
    breadcrumbs,
    files,
    folders,
    propertyFilters,
    query: searchSurface.query,
    selectedFileParam,
    sortState,
    vectorFilteredIds: searchSurface.vectorFilteredIds,
    workspaceName,
  });
  const {
    activeFile,
    currentFolder,
    currentLocationTitle,
    explorerEntries,
    isAtWorkspaceRoot,
    isCurrentFolderReadOnly,
    visibleItemIds,
  } = derivedState;
  const noteWorkflows = useExplorerNoteWorkflows({
    isCurrentFolderReadOnly,
    openWorkspaceFileInFolder,
    workspaceUuid,
  });
  const { createNote } = noteWorkflows;

  const emitSync = useCallback(() => {
    filesUiActions.emitSync(workspaceUuid);
  }, [workspaceUuid]);

  const editWorkflows = useExplorerEditWorkflows({
    allFolders,
    currentFolder,
    emitSync,
    files,
    loadFolder,
    loadTree,
    onCreateNote: createNote,
    startBannerUpload,
    workspaceUuid,
  });
  const { openRenameFileDialog, openRenameFolderDialog } = editWorkflows;

  const shareDialogs = useExplorerShareDialogs({
    workspaceUuid,
  });
  const { openFileShareDialog, openFolderShareDialog } = shareDialogs;

  const runtime = useExplorerRuntime({
    allFiles,
    allFolders,
    breadcrumbs,
    contextActionIdsRef,
    currentFolderId,
    editWorkflows,
    emitSync,
    explorerEntryCount: explorerEntries.length,
    explorerScrollRef,
    fileInputRef,
    folderInputRef,
    gridRef,
    isCurrentFolderReadOnly,
    itemRefs,
    loadFolder,
    loadTree,
    mobileLongPressTimerRef,
    mobileSuppressClickRef,
    navigation,
    noteWorkflows,
    onOpenMobileCreateMenu: openMobileCreateMenu,
    refreshDataDebounced,
    viewMode,
    visibleItemIds,
    workspaceUuid,
  });
  const {
    commandRouting: { focusSearchSignal },
    dragDrop: {
      canvasDropActive,
      dropTargetId,
      getCanvasDropProps,
      getFolderDragProps,
      getFileDragProps,
    },
    fileOperations: {
      canRedoFileOperation,
      canUndoFileOperation,
      deleteContextActionItems,
      deleteSelectionItems,
      downloadContextActionItems,
      downloadItemArchive,
      duplicateContextActionItems,
      duplicateItem,
      fileOperationHistoryBusy,
      hardReingestContextActionItems,
      moveContextActionItemsToFolder,
      moveFolder,
      moveItemsToFolder,
      redoLatestFileOperation,
      undoLatestFileOperation,
    },
    isMobile,
    itemInteractions: {
      beginMobileItemLongPress,
      handleItemContextMenu,
      handleMobileCanvasPointerDown,
      handleMobileItemClick,
      handleMobileItemPointerUp,
      handleOpenOnDoubleClick,
      shouldIgnoreItemClick,
      stopItemSelectionEvent,
    },
    listVirtualizer,
    selection,
    triggerHapticSuccess,
  } = runtime;

  const { browsePaneProps, previewPaneProps } = useExplorerPaneSurfaces({
    activeFile,
    allFiles,
    allFolders,
    breadcrumbs,
    canClosePane,
    closePane,
    currentFolderId,
    derivedState,
    dragDrop: runtime.dragDrop,
    editWorkflows,
    fileInputRef,
    fileOperations: runtime.fileOperations,
    focusSearchSignal,
    folderInputRef,
    gridRef,
    isMobile,
    itemInteractions: runtime.itemInteractions,
    itemRefs,
    listMeasureElement: listVirtualizer.measureElement,
    listTotalSize: listVirtualizer.getTotalSize(),
    listVirtualItems: listVirtualizer.getVirtualItems(),
    loading,
    navigation,
    noteWorkflows,
    openPane,
    paneId,
    propertyControls,
    refreshCurrentFolder: loadFolder,
    scrollRef: explorerScrollRef,
    searchSurface,
    selection,
    setPropertyDefinitions,
    setSortState,
    shareDialogs,
    shell: {
      setViewMode,
      viewMode,
    },
    sortState,
    startBannerUpload,
    triggerHapticSuccess,
    uiState,
    uploadWorkflows: runtime.uploadWorkflows,
    workspaceUuid,
  });

  if (previewPaneProps) {
    return (
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 flex-1 items-center justify-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <Spinner className="size-4" />
              Loading preview...
            </div>
          </div>
        }
      >
        <ExplorerPreviewPane {...previewPaneProps} />
      </Suspense>
    );
  }

  return <ExplorerBrowsePane {...browsePaneProps} />;
}
