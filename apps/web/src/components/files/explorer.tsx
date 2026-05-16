"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  DownloadSimple as ArrowDownToLine,
  Copy,
  FolderPlus as FolderInput,
  Info,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  ArrowCounterClockwise as RotateCcw,
  ShareNetwork as Share2,
  SlidersHorizontal,
  Trash as Trash2,
  MagicWand as WandSparkles,
} from "@phosphor-icons/react";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExplorerBrowsePane } from "@/components/files/explorer/explorer-browse-pane";
import { buildExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props";
import { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";
import { buildExplorerPreviewPaneProps } from "@/components/files/explorer/explorer-preview-pane-props";
import {
  detectPreviewKind,
  type FileRecord,
  type FolderRecord,
  type WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";
import { useExplorerDerivedState } from "@/components/files/explorer/use-explorer-derived-state";
import { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerPaneHeader } from "@/components/files/explorer/use-explorer-pane-header";
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
import { cn } from "@/lib/utils";
import {
  useCurrentWorkspacePane,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
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
const FILE_RETRIEVAL_CONTEXT_KEY = "file-explorer-retrieval-context-v1";
const COMPACT_MENU_SURFACE_CLASS = "border border-border/60 shadow-md";
const FILE_OPERATION_HISTORY_TOAST_ID = "files-operation-history";
const ITEM_ACTION_TARGET_SELECTOR =
  "[data-item-actions='true'], [data-selection-control='true'], button, a, input, textarea, select, label";
const HEADER_SEGMENTED_GROUP_CLASS =
  "items-center divide-x divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background shadow-sm";
const _HEADER_SEGMENT_BUTTON_CLASS =
  "h-9 rounded-none border-0 bg-transparent px-3 text-xs text-foreground shadow-none hover:bg-muted/70 disabled:bg-transparent";
const HEADER_SEGMENT_ICON_BUTTON_CLASS =
  "h-9 w-9 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70 disabled:bg-transparent";
const FILE_EXPLORER_LIST_ROW_ESTIMATE = 52;

interface MobileActionsPopoverProps {
  detail: string;
  folders: FolderRecord[];
  kind: "file" | "folder";
  name: string;
  onCircleToAi?: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onHardReingest?: () => void;
  onMetadata: () => void;
  onMoveTo: (folderId: string) => void;
  onOpenProperties: () => void;
  onRename: () => void;
  onShare: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  readOnly: boolean;
  targetId: string;
}

function MobileActionsPopover({
  detail,
  folders,
  kind,
  name,
  onCircleToAi,
  onDelete,
  onDownload,
  onDuplicate,
  onHardReingest,
  onMetadata,
  onMoveTo,
  onOpenProperties,
  onRename,
  onShare,
  onTogglePin,
  pinned,
  readOnly,
  targetId,
}: MobileActionsPopoverProps) {
  const canEdit = !readOnly;
  const moveTargets = useMemo(
    () =>
      folders.filter((folder) => {
        if (kind === "folder") {
          return folder.id !== targetId && !folder.readOnly;
        }
        return !folder.readOnly;
      }),
    [folders, kind, targetId]
  );

  const actionRowClass = "gap-2 text-xs";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`More actions for ${name}`}
            className="h-7 w-7 shrink-0 rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
            size="icon-sm"
            type="button"
            variant="outline"
          />
        }
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
      >
        {onCircleToAi ? (
          <DropdownMenuItem onClick={onCircleToAi}>
            <WandSparkles className="size-3.5" />
            Circle to AI
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={actionRowClass}>
            <Info className="size-3.5" />
            Properties
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                {name}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <div className="space-y-1 px-2 pb-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Type</span>
                <span className="text-right text-foreground">
                  {kind === "file" ? "File" : "Folder"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">ID</span>
                <span className="max-w-32 truncate text-right text-foreground">
                  {targetId}
                </span>
              </div>
              {detail ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Detail</span>
                  <span className="max-w-32 text-right text-foreground">
                    {detail}
                  </span>
                </div>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenProperties}>
              <SlidersHorizontal className="size-3.5" />
              Metadata
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canEdit ? (
          <>
            <DropdownMenuItem onClick={onTogglePin}>
              {pinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
              {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="size-3.5" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={actionRowClass}>
                <FolderInput className="size-3.5" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
              >
                <ScrollArea className="max-h-48">
                  <div className="p-1">
                    {moveTargets.length === 0 ? (
                      <div className="px-2 py-2 text-center text-muted-foreground text-xs">
                        No destinations available
                      </div>
                    ) : (
                      moveTargets.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => {
                            onMoveTo(folder.id);
                          }}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onDownload}>
              <ArrowDownToLine className="size-3.5" />
              Download
            </DropdownMenuItem>
            {onHardReingest ? (
              <DropdownMenuItem onClick={onHardReingest}>
                <RotateCcw className="size-3.5" />
                Hard Re-ingest
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={actionRowClass}>
            <Info className="size-3.5" />
            Metadata
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
          >
            <div className="space-y-1 px-2 py-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Type</span>
                <span className="text-right text-foreground">
                  {kind === "file" ? "File" : "Folder"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">ID</span>
                <span className="max-w-32 truncate text-right text-foreground">
                  {targetId}
                </span>
              </div>
              {detail ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Detail</span>
                  <span className="max-w-32 text-right text-foreground">
                    {detail}
                  </span>
                </div>
              ) : null}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onMetadata}>
          <SlidersHorizontal className="size-3.5" />
          Properties
        </DropdownMenuItem>
        {readOnly ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  } = useExplorerSurfaceUiState();
  const { paneId } = useCurrentWorkspacePane();
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const _setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );

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
  const {
    navigateToFolder,
    openFileById,
    openFolderById,
    openSearchResult,
    openWorkspaceFileInFolder,
    selectFile,
  } = useExplorerNavigation({
    allFiles,
    currentFolderId,
    router,
    searchParams,
    workspaceUuid,
  });
  const searchSurface = useExplorerSearchSurface({
    onOpenFolderById: openFolderById,
    onOpenSearchResult: openSearchResult,
    selectedRetrievalChunkParam,
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
  } = useExplorerPropertyControls({
    allFiles,
    propertyDefinitions,
    workspaceUuid,
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
  } = useExplorerDerivedState({
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
    contentDialogProps: noteWorkflowContentDialogProps,
    createNote,
    openImportLinkDialog,
  } = useExplorerNoteWorkflows({
    isCurrentFolderReadOnly,
    openWorkspaceFileInFolder,
    workspaceUuid,
  });

  const { filePathById, searchableItems, workspaceFileIndex } =
    useExplorerWorkspaceIndexState({
      allFiles,
      allFolders,
    });
  const {
    detectFileKind,
    getFileVisualIcon,
    handlePreviewIntentEnd,
    handlePreviewIntentStart,
    hoveredPreviewFileId,
    wikiLinkableFiles,
  } = useExplorerFilePresentation({
    workspaceFileIndex,
  });
  const {
    currentInfoEntries,
    currentPinnedItem,
    folderFileCount,
    folderPreviewKinds,
    folderSubfolderCount,
    isCurrentPinned,
  } = useExplorerSurfaceSummary({
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

  const emitSync = useCallback(() => {
    filesUiActions.emitSync(workspaceUuid);
  }, [workspaceUuid]);

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
  } = useExplorerEditWorkflows({
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
  const handleApplyEditDialog = useCallback(() => {
    void applyEditDialog();
  }, [applyEditDialog]);

  const {
    fileShareDialogProps,
    folderShareDialogProps,
    openFileShareDialog,
    openFolderShareDialog,
  } = useExplorerShareDialogs({
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
      getContextActionItems: resolveContextActionItems,
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
    uploadWorkflows: { getDropUploadCandidates, queueUploads },
  } = useExplorerRuntime({
    allFiles,
    allFolders,
    breadcrumbs,
    contextActionIdsRef,
    currentFolderId,
    editWorkflows: {
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
    },
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
    navigation: {
      navigateToFolder,
      openFileById,
      openFolderById,
      openSearchResult,
      openWorkspaceFileInFolder,
      selectFile,
    },
    noteWorkflows: {
      contentDialogProps: noteWorkflowContentDialogProps,
      createNote,
      openImportLinkDialog,
    },
    onOpenMobileCreateMenu: openMobileCreateMenu,
    refreshDataDebounced,
    viewMode,
    visibleItemIds,
    workspaceUuid,
  });

  const toggleCurrentPinnedItem = useCallback(() => {
    if (!(workspaceUuid && currentPinnedItem)) {
      return;
    }
    filesPinsActions.togglePinnedItem(workspaceUuid, currentPinnedItem);
  }, [currentPinnedItem, workspaceUuid]);

  const _hardReingestFile = useCallback(
    async (file: FileRecord) => {
      if (!workspaceUuid || file.readOnly) {
        return;
      }

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
        const message = payload.error ?? "Unable to re-ingest file.";
        toast.error(message);
        throw new Error(message);
      }

      toast.success("File queued for hard re-ingestion.");
      await Promise.all([loadFolder({ silent: true }), loadTree()]);
      emitSync();
    },
    [emitSync, loadFolder, loadTree, workspaceUuid]
  );

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

  const { getFileItemActionProps, getFolderItemActionProps } =
    useExplorerItemActionProps({
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
    currentFolder,
    deleteSelectionItems,
    downloadItemArchive,
    duplicateItem,
    moveFolder,
    openFolderShareDialog,
    openPane,
    openRenameFolderDialog,
    paneId,
    setPropertiesItem,
    setPropertiesOpen,
  });

  const _downloadFileDirect = useCallback(
    async (file: FileRecord) => {
      try {
        const sourceUrl =
          file.isNote || detectPreviewKind(file).isMarkdown
            ? `/api/workspaces/${workspaceUuid}/files/${file.id}/stream`
            : file.storageUrl;
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error("Download failed");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        const fallbackUrl =
          file.isNote || detectPreviewKind(file).isMarkdown
            ? `/api/workspaces/${workspaceUuid}/files/${file.id}/stream`
            : file.storageUrl;
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }
    },
    [workspaceUuid]
  );

  useExplorerPaneHeader({
    activeFile,
    allFolders,
    breadcrumbs,
    canClosePane,
    closePane,
    currentLocationTitle,
    currentFolder,
    currentInfoEntries,
    deleteCurrentFolder,
    downloadCurrentFolder,
    duplicateCurrentFolder,
    isAtWorkspaceRoot,
    isCurrentPinned,
    menuSurfaceClass: COMPACT_MENU_SURFACE_CLASS,
    moveCurrentFolderTo,
    navigateToFolder,
    openCurrentFolderProperties,
    openCurrentFolderRename,
    openCurrentFolderShare: shareCurrentFolder,
    openPaneRight,
    toggleCurrentPinnedItem,
    paneId,
  });

  const previewPaneProps = activeFile
    ? buildExplorerPreviewPaneProps({
        activeFile,
        allFiles,
        allFolders,
        currentInfoEntries,
        deleteContextActionItems,
        downloadContextActionItems,
        duplicateContextActionItems,
        filePreviewRetrievalProps: searchSurface.filePreviewRetrievalProps,
        fileShareDialogProps,
        folderShareDialogProps,
        hardReingestContextActionItems,
        isCurrentPinned,
        moveContextActionItemsToFolder,
        openFileById,
        openFileShareDialog,
        openRenameFileDialog,
        propertyDefinitions: availablePropertyDefinitions,
        setPropertyDefinitions,
        startBannerUpload,
        toggleCurrentPinnedItem,
        wikiLinkableFiles,
        workspaceUuid,
      })
    : null;
  const searchBarProps = searchSurface.getSearchBarProps({
    focusSearchSignal,
    onOpenFileById: openFileById,
    onOpenFolderById: openFolderById,
    searchableItems,
  });
  const browsePaneProps = buildExplorerBrowsePaneProps({
    allFolders,
    availablePropertyDefinitions,
    bannerInputRef,
    bannerUploadBusy,
    canMoveSelectionUp: Boolean(breadcrumbs.at(-2)?.id),
    canNavigateUp: !isAtWorkspaceRoot && Boolean(parentFolder),
    canvasDropActive,
    canvasDropProps: getCanvasDropProps(),
    canRedoFileOperation,
    canUndoFileOperation,
    cardFieldQuery,
    cardPropertyKeys,
    clearSelection: selection.clearSelection,
    contextMenuSurfaceClass: COMPACT_MENU_SURFACE_CLASS,
    currentFolder,
    currentFolderBannerUrl,
    currentFolderId,
    currentLocationTitle,
    deleteSelectionItems,
    downloadStatus,
    dropTargetId,
    editDialog,
    explorerEntries,
    fileInputRef,
    fileOperationHistoryBusy,
    fileShareDialogProps,
    filteredAvailablePropertyDefinitions,
    folderFileCount,
    folderInputRef,
    folderPreviewKinds,
    folderShareDialogProps,
    folderSubfolderCount,
    getFileDragProps,
    getFileIcon: getFileVisualIcon,
    getFileItemActionProps,
    getFileKind: detectFileKind,
    getFolderDragProps,
    getFolderItemActionProps,
    getSelectedActionItems: resolveSelectedActionItems,
    gridRef,
    handleApplyEditDialog,
    handleEditDialogOpenChange,
    handleEditDialogValueChange,
    handlePropertyFiltersChange,
    hoveredPreviewFileId,
    interactions: {
      beginMobileItemLongPress,
      handleItemContextMenu,
      handleMobileItemClick,
      handleMobileItemPointerUp,
      handleOpenOnDoubleClick,
      shouldIgnoreItemClick,
      stopItemSelectionEvent,
    },
    isCurrentFolderReadOnly,
    isMobile,
    itemActionTargetSelector: ITEM_ACTION_TARGET_SELECTOR,
    listMeasureElement: listVirtualizer.measureElement,
    listTotalSize: listVirtualizer.getTotalSize(),
    listVirtualItems: listVirtualizer.getVirtualItems(),
    loading,
    mobileConfirmAction,
    mobileCreateMenuOpen,
    moveItemsToFolder,
    moveSelectionTargetFolderId: breadcrumbs.at(-2)?.id ?? null,
    noteWorkflowContentDialogProps: {
      ...noteWorkflowContentDialogProps,
    },
    onBannerInputChange: handleBannerInputChange,
    onCardFieldQueryChange: handleCardFieldQueryChange,
    onCardFieldToggle: handleCardFieldToggle,
    onChangeFolderBanner: triggerBannerPicker,
    onClearCardFields: clearCardFields,
    onCreateFolder: openCreateFolderDialog,
    onCreateNote: openCreateNoteDialog,
    onImportLink: openImportLinkDialog,
    onMobileCanvasPointerDown: handleMobileCanvasPointerDown,
    onNavigateUp: () => {
      if (parentFolder) {
        navigateToFolder(parentFolder.id);
      }
    },
    onOpenFile: selectFile,
    onOpenFolder: navigateToFolder,
    onOpenMobileCreateMenu: openMobileCreateMenu,
    onPreviewIntentEnd: handlePreviewIntentEnd,
    onPreviewIntentStart: handlePreviewIntentStart,
    onQueueFiles: (incomingFiles) => {
      queueUploads(incomingFiles.map((file) => ({ file })));
    },
    onQueueFolderFiles: queueUploads,
    onRedo: () => {
      void redoLatestFileOperation();
    },
    onRefresh: refreshData,
    onResetCardFields: resetCardFields,
    onResetFolderBanner: (folderId) => {
      void resetFolderBanner(folderId);
    },
    onUndo: () => {
      void undoLatestFileOperation();
    },
    onUploadFile: () => fileInputRef.current?.click(),
    onUploadFolder: () => folderInputRef.current?.click(),
    propertiesItem,
    propertiesOpen,
    propertyFilterFields,
    propertyFiltersForUi,
    scrollRef: explorerScrollRef,
    searchBarProps,
    selectedCardPropertyDefinitions,
    selectedCount: selection.selectedCount,
    selectedIds: selection.getSelectedIds(),
    selection,
    selectionRect: selection.selectionRect,
    setItemRowRefMap: itemRefs,
    setMobileConfirmAction,
    setMobileCreateMenuOpen,
    setPropertiesOpen,
    setSortState,
    setViewMode,
    sortState,
    sortedFiles,
    sortedFolders,
    startHapticSuccess: triggerHapticSuccess,
    viewMode,
    visibleItemIds,
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
