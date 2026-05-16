"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExplorerBrowsePane } from "@/components/files/explorer/explorer-browse-pane";
import { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";
import type {
  FileRecord,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import { useExplorerDerivedState } from "@/components/files/explorer/use-explorer-derived-state";
import { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerPaneSurfaces } from "@/components/files/explorer/use-explorer-pane-surfaces";
import { useExplorerPropertyControls } from "@/components/files/explorer/use-explorer-property-controls";
import { useExplorerRuntime } from "@/components/files/explorer/use-explorer-runtime";
import { useExplorerSearchSurface } from "@/components/files/explorer/use-explorer-search-surface";
import { useExplorerShareDialogs } from "@/components/files/explorer/use-explorer-share-dialogs";
import { useExplorerShell } from "@/components/files/explorer/use-explorer-shell";
import { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";
import { useExplorerSurfaceUiState } from "@/components/files/explorer/use-explorer-surface-ui-state";
import { useExplorerWorkspaceIndexState } from "@/components/files/explorer/use-explorer-workspace-index-state";
import { useWorkspaceExplorerData } from "@/components/files/explorer/use-workspace-explorer-data";
import type { BulkItemKind } from "@/components/files/explorer/workspace-bulk-operations-model";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import { useUploadThing } from "@/lib/uploadthing";
import {
  useCurrentWorkspacePane,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { filesPinsActions, useFilesPinsStore } from "@/stores/filesPinsStore";
import { filesUiActions } from "@/stores/filesUiStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const MOBILE_LONG_PRESS_DELAY_MS = 450;

type UploadStatus =
  | "failed"
  | "ingesting"
  | "queued"
  | "uploaded"
  | "uploading";
const FILE_CARD_FIELD_STORAGE_PREFIX = "file-explorer-card-fields:v1:";
const COMPACT_MENU_SURFACE_CLASS = "border border-border/60 shadow-md";
const FILE_OPERATION_HISTORY_TOAST_ID = "files-operation-history";
const ITEM_ACTION_TARGET_SELECTOR =
  "[data-item-actions='true'], [data-selection-control='true'], button, a, input, textarea, select, label";
const FILE_EXPLORER_LIST_ROW_ESTIMATE = 52;

interface UploadResultLike {
  contentType?: string;
  key?: string;
  name?: string;
  size?: number;
  ufsUrl?: string;
}

interface BulkRegisterResponse {
  results?: Array<{
    clientUploadId: string;
    error?: string;
    file?: { id?: string };
    ingestionJob?: { id?: string } | null;
    status: "failed" | "ok";
  }>;
  summary?: {
    failed?: number;
    succeeded?: number;
    total?: number;
  };
}

interface DedupeLookupResponse {
  results?: Array<{
    clientUploadId: string;
    deduped: boolean;
    file?: { id?: string };
  }>;
}

interface FilesInvalidationEventPayload {
  folderId?: string | null;
  reason?: string;
  workspaceUuid?: string;
}

interface WebkitFileSystemEntry {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
}

interface WebkitFileSystemFileEntry extends WebkitFileSystemEntry {
  file: (
    callback: (file: File) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

interface WebkitFileSystemDirectoryReader {
  readEntries: (
    callback: (entries: WebkitFileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

interface WebkitFileSystemDirectoryEntry extends WebkitFileSystemEntry {
  createReader: () => WebkitFileSystemDirectoryReader;
}

const DEFAULT_FOLDER_BANNER_URL =
  "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0";

function rgbToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

async function extractImageAccentColor(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("Unable to read banner image."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const sampleWidth = 48;
    const sampleHeight = 48;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    let totalWeight = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha < 0.02) {
        continue;
      }

      totalRed += data[index] * alpha;
      totalGreen += data[index + 1] * alpha;
      totalBlue += data[index + 2] * alpha;
      totalWeight += alpha;
    }

    if (totalWeight === 0) {
      return null;
    }

    return `#${rgbToHex(totalRed / totalWeight)}${rgbToHex(totalGreen / totalWeight)}${rgbToHex(totalBlue / totalWeight)}`;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function getDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)(?:;|$)/i
  );
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = contentDisposition.match(/filename=([^;]+)/i);
  return bareMatch?.[1]?.trim() ?? null;
}

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
  const [workspaceMembers, _setWorkspaceMembers] = useState<
    WorkspaceMemberRecord[]
  >([]);
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
  const pinnedByWorkspace = useFilesPinsStore(
    (state) => state.pinnedByWorkspace
  );
  const pinnedItems = useMemo(
    () => pinnedByWorkspace[workspaceUuid] ?? [],
    [pinnedByWorkspace, workspaceUuid]
  );

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
    openFileById,
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
  const {
    availablePropertyDefinitions,
    cardFieldQuery,
    cardPropertyKeys,
    clearCardFields,
    filteredAvailablePropertyDefinitions,
    handleCardFieldQueryChange,
    handleCardFieldToggle,
    handlePropertyFiltersChange,
    propertyFilters,
    propertyFilterFields,
    propertyFiltersForUi,
    resetCardFields,
    selectedCardPropertyDefinitions,
  } = propertyControls;
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
    currentFolderBannerUrl,
    currentLocationTitle,
    explorerEntries,
    filteredFiles,
    filteredFolders,
    isAtWorkspaceRoot,
    isCurrentFolderReadOnly,
    parentFolder,
    sortedFiles,
    sortedFolders,
    visibleItemIds,
  } = derivedState;
  const noteWorkflows = useExplorerNoteWorkflows({
    isCurrentFolderReadOnly,
    openWorkspaceFileInFolder,
    workspaceUuid,
  });
  const {
    contentDialogProps: noteWorkflowContentDialogProps,
    createNote,
    openImportLinkDialog,
  } = noteWorkflows;

  const workspaceIndexState = useExplorerWorkspaceIndexState({
    allFiles,
    allFolders,
  });
  const { filePathById, searchableItems, workspaceFileIndex } =
    workspaceIndexState;
  const filePresentation = useExplorerFilePresentation({
    workspaceFileIndex,
  });
  const {
    detectFileKind,
    getFileVisualIcon,
    handlePreviewIntentEnd,
    handlePreviewIntentStart,
    hoveredPreviewFileId,
    wikiLinkableFiles,
  } = filePresentation;
  const surfaceSummary = useExplorerSurfaceSummary({
    activeFile,
    allFiles,
    allFolders,
    currentFolder,
    currentLocationTitle,
    detectFileKind,
    filePathById,
    isAtWorkspaceRoot,
    pinnedItems,
    workspaceMembers,
    workspaceUuid,
  });
  const {
    currentInfoEntries,
    currentPinnedItem,
    folderFileCount,
    folderPreviewKinds,
    folderSubfolderCount,
    isCurrentPinned,
  } = surfaceSummary;

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
  const {
    applyEditDialog,
    bannerInputRef,
    bannerUploadBusy,
    editDialog,
    handleBannerInputChange,
    handleEditDialogOpenChange,
    handleEditDialogValueChange,
    openCreateFolderDialog,
    openCreateNoteDialog,
    openRenameFileDialog,
    openRenameFolderDialog,
    resetFolderBanner,
    triggerBannerPicker,
  } = editWorkflows;
  const handleApplyEditDialog = useCallback(() => {
    void applyEditDialog();
  }, [applyEditDialog]);

  const shareDialogs = useExplorerShareDialogs({
    workspaceUuid,
  });
  const {
    fileShareDialogProps,
    folderShareDialogProps,
    openFileShareDialog,
    openFolderShareDialog,
  } = shareDialogs;

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
      downloadStatus,
      duplicateContextActionItems,
      duplicateItem,
      fileOperationHistoryBusy,
      getSelectedActionItems: resolveSelectedActionItems,
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
    uploadWorkflows: { queueUploads },
  } = runtime;

  const toggleCurrentPinnedItem = useCallback(() => {
    if (!(workspaceUuid && currentPinnedItem)) {
      return;
    }
    filesPinsActions.togglePinnedItem(workspaceUuid, currentPinnedItem);
  }, [currentPinnedItem, workspaceUuid]);

  const hardReingestSelectionItems = useCallback(
    async (items: Array<{ id: string; kind: BulkItemKind }>) => {
      if (!workspaceUuid) {
        return;
      }

      const filesToReingest = items
        .filter((item) => item.kind === "file")
        .map((item) => allFiles.find((entry) => entry.id === item.id))
        .filter((file): file is FileRecord => Boolean(file && !file.readOnly));

      if (filesToReingest.length === 0) {
        return;
      }

      let succeeded = 0;

      for (const file of filesToReingest) {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/files/${file.id}/reingest`,
          {
            method: "POST",
          }
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          toast.error(payload.error ?? "Unable to re-ingest file.");
          continue;
        }

        succeeded += 1;
      }

      if (succeeded === 0) {
        return;
      }

      toast.success(
        succeeded === 1
          ? "File queued for hard re-ingestion."
          : `${succeeded} files queued for hard re-ingestion.`
      );
      await Promise.all([loadFolder({ silent: true }), loadTree()]);
      emitSync();
    },
    [allFiles, emitSync, loadFolder, loadTree, workspaceUuid]
  );

  const itemActionProps = useExplorerItemActionProps({
    allFolders,
    deleteContextActionItems,
    downloadContextActionItems,
    duplicateContextActionItems,
    hardReingestContextActionItems,
    isPinned: (kind, itemId) =>
      Boolean(filesPinsActions.isPinned(workspaceUuid, kind, itemId)),
    moveContextActionItemsToFolder,
    onOpenPropertiesItem: openPropertiesItem,
    onSelectFile: selectFile,
    openFileShareDialog,
    openFolderShareDialog,
    openRenameFileDialog,
    openRenameFolderDialog,
    togglePinnedItem: (item) => {
      filesPinsActions.togglePinnedItem(workspaceUuid, item);
    },
    workspaceUuid,
  });
  const { getFileItemActionProps, getFolderItemActionProps } = itemActionProps;

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
    filePresentation,
    focusSearchSignal,
    folderInputRef,
    gridRef,
    isMobile,
    itemActionProps,
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
    searchableItems,
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
    surfaceSummary,
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
