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
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ExplorerBrowsePane } from "@/components/files/explorer/explorer-browse-pane";
import { buildExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props";
import {
  formatCardPropertyValue,
  getFileProperties,
} from "@/components/files/explorer/explorer-file-properties-model";
import { ExplorerPreviewPane } from "@/components/files/explorer/explorer-preview-pane";
import { buildExplorerPreviewPaneProps } from "@/components/files/explorer/explorer-preview-pane-props";
import {
  buildExplorerFilePreviewRetrievalProps,
  buildExplorerSearchBarProps,
} from "@/components/files/explorer/explorer-retrieval-props";
import {
  detectPreviewKind,
  type FileRecord,
  type FolderRecord,
  formatBytes,
  type WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";
import { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import { useExplorerFilePresentation } from "@/components/files/explorer/use-explorer-file-presentation";
import { useExplorerItemActionProps } from "@/components/files/explorer/use-explorer-item-action-props";
import { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerPaneHeader } from "@/components/files/explorer/use-explorer-pane-header";
import { useExplorerPropertyControls } from "@/components/files/explorer/use-explorer-property-controls";
import { useExplorerRuntime } from "@/components/files/explorer/use-explorer-runtime";
import { useExplorerShareDialogs } from "@/components/files/explorer/use-explorer-share-dialogs";
import { useExplorerSurfaceSummary } from "@/components/files/explorer/use-explorer-surface-summary";
import { useExplorerSurfaceUiState } from "@/components/files/explorer/use-explorer-surface-ui-state";
import type { BulkItemKind } from "@/components/files/explorer/workspace-bulk-operations-model";
import type { SortState } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import { readCachedWorkspaces } from "@/lib/dashboard-browser-cache";
import {
  normalizePropertyDefinitions,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";
import {
  readWorkspaceFolderCache,
  writeWorkspaceFolderCache,
} from "@/lib/workspace-folder-cache";
import {
  useCurrentWorkspacePane,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import {
  readWorkspaceTreeCache,
  writeWorkspaceTreeCache,
} from "@/lib/workspace-tree-cache";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
import { filesPinsActions, useFilesPinsStore } from "@/stores/filesPinsStore";
import { filesUiActions } from "@/stores/filesUiStore";
import {
  usePaneWorkspaceHistoryActions,
  usePaneWorkspaceHistoryStore,
} from "@/stores/workspaceHistoryStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const MOBILE_LONG_PRESS_DELAY_MS = 450;

type UploadStatus =
  | "failed"
  | "ingesting"
  | "queued"
  | "uploaded"
  | "uploading";
const FILE_EXPLORER_VIEW_MODE_KEY = "file-explorer-view-mode";
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

type ExplorerEntry =
  | { folder: FolderRecord; id: string; kind: "folder" }
  | { file: FileRecord; id: string; kind: "file" };

async function loadWorkspacePropertyDefinitions(workspaceUuid: string) {
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/property-registry`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { properties?: unknown };
  return normalizePropertyDefinitions(payload.properties);
}

async function loadWorkspaceName(workspaceUuid: string) {
  const response = await fetch("/api/workspaces/list", {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    workspaces?: Array<{
      name: string;
      workspaceId: string;
    }>;
  };
  return (
    (payload.workspaces ?? []).find(
      (workspace) => workspace.workspaceId === workspaceUuid
    )?.name ?? null
  );
}

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
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeMatch = pathname.match(
    /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)/
  );
  const workspaceUuidParam = routeMatch?.[1];
  const folderUuidParam = routeMatch?.[2];
  const workspaceUuid = useMemo(() => {
    if (workspaceUuidFromPage) {
      return workspaceUuidFromPage;
    }
    return workspaceUuidParam ?? "";
  }, [workspaceUuidFromPage, workspaceUuidParam]);
  const currentFolderId = useMemo(() => {
    if (folderUuidFromPage) {
      return folderUuidFromPage;
    }
    return folderUuidParam ?? "";
  }, [folderUuidFromPage, folderUuidParam]);

  const [query, setQuery] = useState("");
  const [sortState, setSortState] = useState<SortState>({
    direction: "asc",
    key: "name",
    kind: "builtin",
  });
  const [vectorFilteredIds, setVectorFilteredIds] =
    useState<Set<string> | null>(null);
  const [retrievalResults, setRetrievalResults] = useState<
    WorkspaceSearchResult[]
  >([]);
  const [activeRetrievalChunkId, setActiveRetrievalChunkId] = useState<
    string | null
  >(null);
  const [allFolders, setAllFolders] = useState<FolderRecord[]>([]);
  const [allFiles, setAllFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaceMembers, _setWorkspaceMembers] = useState<
    WorkspaceMemberRecord[]
  >([]);
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [propertyDefinitions, setPropertyDefinitions] = useState<
    WorkspacePropertyDefinition[]
  >([]);
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    try {
      return window.localStorage.getItem(FILE_EXPLORER_VIEW_MODE_KEY) === "list"
        ? "list"
        : "cards";
    } catch {
      return "cards";
    }
  });
  const loadedPropertyRegistryWorkspaceRef = useRef<string | null>(null);
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
  const paneCount = useWorkspacePaneStore((state) => state.panes.length);
  const _setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );

  const { startUpload: startBannerUpload } = useUploadThing("imageUploader");
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const historyEntries = usePaneWorkspaceHistoryStore((state) => state.entries);
  const historyIndex = usePaneWorkspaceHistoryStore((state) => state.index);
  const _backRoute =
    historyIndex > 0 ? (historyEntries[historyIndex - 1] ?? null) : null;
  const _forwardRoute =
    historyIndex >= 0 && historyIndex < historyEntries.length - 1
      ? (historyEntries[historyIndex + 1] ?? null)
      : null;
  const canClosePane = paneCount > 1;
  const pinnedByWorkspace = useFilesPinsStore(
    (state) => state.pinnedByWorkspace
  );
  const pinnedItems = useMemo(
    () => pinnedByWorkspace[workspaceUuid] ?? [],
    [pinnedByWorkspace, workspaceUuid]
  );
  const lastRecordedRouteRef = useRef<string | null>(null);

  const selectedFileParam = searchParams.get("file");
  const selectedRetrievalChunkParam = searchParams.get("retrievalChunk");
  const currentRoute = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);
  const activeFile = useMemo(
    () => files.find((file) => file.id === selectedFileParam) ?? null,
    [files, selectedFileParam]
  );

  const currentFolder = useMemo(
    () => breadcrumbs.at(-1) ?? null,
    [breadcrumbs]
  );
  const isCurrentFolderReadOnly = Boolean(currentFolder?.readOnly);
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

  const {
    contentDialogProps: noteWorkflowContentDialogProps,
    createNote,
    openImportLinkDialog,
  } = useExplorerNoteWorkflows({
    isCurrentFolderReadOnly,
    openWorkspaceFileInFolder,
    workspaceUuid,
  });

  const parentFolder = useMemo(() => breadcrumbs.at(-2) ?? null, [breadcrumbs]);
  const isAtWorkspaceRoot = breadcrumbs.length <= 1;
  const currentLocationTitle = isAtWorkspaceRoot
    ? workspaceName
    : (currentFolder?.name ?? workspaceName);
  const currentFolderBannerUrl =
    currentFolder?.bannerUrl && currentFolder.bannerUrl.trim().length > 0
      ? currentFolder.bannerUrl
      : DEFAULT_FOLDER_BANNER_URL;
  const searchableItems = useMemo<WorkspaceSearchItem[]>(
    () => [
      ...allFolders.map((folder) => ({
        id: folder.id,
        type: "folder" as const,
        title: folder.name,
        description: "Folder",
        snippet: "Folder in workspace",
      })),
      ...allFiles.map((file) => ({
        id: file.id,
        type: "file" as const,
        title: file.name,
        description: file.mimeType ?? "File",
        snippet: `${formatBytes(file.sizeBytes)} • ${file.mimeType ?? "unknown type"}`,
      })),
    ],
    [allFiles, allFolders]
  );
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

  const filteredFolders = useMemo(() => {
    const term = query.trim().toLowerCase();
    const activeVectorIds =
      vectorFilteredIds && vectorFilteredIds.size > 0
        ? vectorFilteredIds
        : null;
    return activeVectorIds
      ? folders.filter((folder) => activeVectorIds.has(folder.id))
      : term
        ? folders.filter((folder) => folder.name.toLowerCase().includes(term))
        : folders;
  }, [folders, query, vectorFilteredIds]);

  const filteredFiles = useMemo(() => {
    const term = query.trim().toLowerCase();
    const activeVectorIds =
      vectorFilteredIds && vectorFilteredIds.size > 0
        ? vectorFilteredIds
        : null;
    const base = activeVectorIds
      ? files.filter((file) => activeVectorIds.has(file.id))
      : term
        ? files.filter((file) => file.name.toLowerCase().includes(term))
        : files;
    if (propertyFilters.length === 0) {
      return base;
    }

    return base.filter((file) => {
      const properties = getFileProperties(file);

      return propertyFilters.every((filter) => {
        const property = properties[filter.key];
        if (!property) {
          return filter.operator === "is_empty";
        }

        const needle = filter.value.trim().toLowerCase();
        switch (property.type) {
          case "checkbox":
            return filter.operator === "is_true"
              ? property.value
              : !property.value;
          case "date":
          case "text":
          case "select": {
            const value = String(property.value ?? "").toLowerCase();
            switch (filter.operator) {
              case "contains":
                return value.includes(needle);
              case "eq":
                return value === needle;
              case "gt":
                return value > needle;
              case "gte":
                return value >= needle;
              case "is_empty":
                return value.length === 0;
              case "is_not":
                return value !== needle;
              case "is_not_empty":
                return value.length > 0;
              case "lt":
                return value < needle;
              case "lte":
                return value <= needle;
              default:
                return true;
            }
          }
          case "number": {
            const value = property.value;
            const operand = Number(filter.value);
            if (filter.operator === "is_empty") {
              return value === null;
            }
            if (value === null || !Number.isFinite(operand)) {
              return false;
            }
            switch (filter.operator) {
              case "eq":
                return value === operand;
              case "gt":
                return value > operand;
              case "gte":
                return value >= operand;
              case "lt":
                return value < operand;
              case "lte":
                return value <= operand;
              default:
                return false;
            }
          }
          case "multi_select": {
            const values = property.value.map((entry) => entry.toLowerCase());
            const needles = filter.value
              .split(",")
              .map((entry) => entry.trim().toLowerCase())
              .filter(Boolean);
            switch (filter.operator) {
              case "contains_any":
                return needles.some((entry) => values.includes(entry));
              case "contains_all":
                return needles.every((entry) => values.includes(entry));
              case "contains_none":
                return needles.every((entry) => !values.includes(entry));
              case "is_empty":
                return values.length === 0;
              default:
                return true;
            }
          }
        }
      });
    });
  }, [files, propertyFilters, query, vectorFilteredIds]);

  const sortedFolders = useMemo(
    () =>
      [...filteredFolders].sort((a, b) => {
        if (sortState.kind === "builtin" && sortState.key === "name") {
          return a.name.localeCompare(b.name);
        }
        const aDate = new Date(
          sortState.kind === "builtin" && sortState.key === "updatedAt"
            ? (a.updatedAt ?? a.createdAt ?? 0)
            : (a.createdAt ?? 0)
        ).getTime();
        const bDate = new Date(
          sortState.kind === "builtin" && sortState.key === "updatedAt"
            ? (b.updatedAt ?? b.createdAt ?? 0)
            : (b.createdAt ?? 0)
        ).getTime();
        return sortState.direction === "asc" ? aDate - bDate : bDate - aDate;
      }),
    [filteredFolders, sortState]
  );

  const sortedFiles = useMemo(
    () =>
      [...filteredFiles].sort((a, b) => {
        if (sortState.kind === "builtin") {
          if (sortState.key === "name") {
            return sortState.direction === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          }

          const aDate = new Date(
            sortState.key === "updatedAt"
              ? (a.updatedAt ?? a.createdAt)
              : a.createdAt
          ).getTime();
          const bDate = new Date(
            sortState.key === "updatedAt"
              ? (b.updatedAt ?? b.createdAt)
              : b.createdAt
          ).getTime();

          return sortState.direction === "asc" ? aDate - bDate : bDate - aDate;
        }

        const left = getFileProperties(a)[sortState.key];
        const right = getFileProperties(b)[sortState.key];
        if (!(left || right)) {
          return a.name.localeCompare(b.name);
        }
        if (!left) {
          return 1;
        }
        if (!right) {
          return -1;
        }

        const leftValue = formatCardPropertyValue(left).toLowerCase();
        const rightValue = formatCardPropertyValue(right).toLowerCase();
        const compare =
          left.type === "number" && right.type === "number"
            ? (left.value ?? Number.POSITIVE_INFINITY) -
              (right.value ?? Number.POSITIVE_INFINITY)
            : leftValue.localeCompare(rightValue);

        if (compare === 0) {
          return a.name.localeCompare(b.name);
        }
        return sortState.direction === "asc" ? compare : compare * -1;
      }),
    [filteredFiles, sortState]
  );

  const visibleItemIds = useMemo(
    () => [
      ...sortedFolders.map((folder) => folder.id),
      ...sortedFiles.map((file) => file.id),
    ],
    [sortedFiles, sortedFolders]
  );
  const explorerEntries = useMemo<ExplorerEntry[]>(
    () => [
      ...sortedFolders.map((folder) => ({
        folder,
        id: folder.id,
        kind: "folder" as const,
      })),
      ...sortedFiles.map((file) => ({
        file,
        id: file.id,
        kind: "file" as const,
      })),
    ],
    [sortedFiles, sortedFolders]
  );

  const workspaceFileIndex = useMemo(
    () =>
      createWorkspaceFileIndex({
        files: allFiles,
        folders: allFolders,
      }),
    [allFiles, allFolders]
  );
  const filePathById = workspaceFileIndex.filePathById;
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

  const loadFolder = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!(workspaceUuid && currentFolderId)) {
        return;
      }
      const silent = options?.silent ?? false;
      const cached = readWorkspaceFolderCache<FolderRecord, FileRecord>(
        workspaceUuid,
        currentFolderId
      );

      if (cached) {
        setLoading(false);
        setFolders(cached.folders);
        setFiles(cached.files);
        setBreadcrumbs(cached.ancestors);
      }

      if (!(silent || cached)) {
        setLoading(true);
      }
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/folders/${currentFolderId}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          folders?: FolderRecord[];
          files?: FileRecord[];
          ancestors?: FolderRecord[];
        };

        const nextFolders = payload.folders ?? [];
        const nextFiles = payload.files ?? [];
        const nextAncestors = payload.ancestors ?? [];

        setFolders(nextFolders);
        setFiles(nextFiles);
        setBreadcrumbs(nextAncestors);
        writeWorkspaceFolderCache<FolderRecord, FileRecord>(
          workspaceUuid,
          currentFolderId,
          {
            ancestors: nextAncestors,
            files: nextFiles,
            folders: nextFolders,
          }
        );
      } finally {
        if (!(silent || cached)) {
          setLoading(false);
        }
      }
    },
    [currentFolderId, workspaceUuid]
  );

  const loadTree = useCallback(async () => {
    if (!workspaceUuid) {
      return;
    }

    const cached = readWorkspaceTreeCache<FolderRecord, FileRecord>(
      workspaceUuid
    );
    if (cached) {
      setAllFolders(cached.folders);
      setAllFiles(cached.files);
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceUuid}/tree`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        folders?: FolderRecord[];
        files?: FileRecord[];
      };
      setAllFolders(payload.folders ?? []);
      setAllFiles(payload.files ?? []);
      writeWorkspaceTreeCache<FolderRecord, FileRecord>(workspaceUuid, {
        files: payload.files ?? [],
        folders: payload.folders ?? [],
      });
    } catch {
      // ignore
    }
  }, [workspaceUuid]);

  const refreshData = useCallback(() => {
    void loadFolder({ silent: true });
    void loadTree();
  }, [loadFolder, loadTree]);

  const refreshDataDebounced = useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }

    refreshDebounceRef.current = setTimeout(() => {
      refreshData();
    }, 300);
  }, [refreshData]);

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

  useEffect(() => {
    if (!(workspaceUuid && currentFolderId)) {
      setFolders([]);
      setFiles([]);
      setBreadcrumbs([]);
      return;
    }

    const cached = readWorkspaceFolderCache<FolderRecord, FileRecord>(
      workspaceUuid,
      currentFolderId
    );
    if (!cached) {
      return;
    }

    setFolders(cached.folders);
    setFiles(cached.files);
    setBreadcrumbs(cached.ancestors);
  }, [currentFolderId, workspaceUuid]);

  useEffect(() => {
    void loadFolder();
  }, [loadFolder]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (!workspaceUuid) {
      setPropertyDefinitions([]);
      loadedPropertyRegistryWorkspaceRef.current = null;
      return;
    }
    if (loadedPropertyRegistryWorkspaceRef.current === workspaceUuid) {
      return;
    }

    let cancelled = false;
    loadedPropertyRegistryWorkspaceRef.current = workspaceUuid;
    void (async () => {
      try {
        const normalized =
          await loadWorkspacePropertyDefinitions(workspaceUuid);
        if (cancelled) {
          return;
        }
        setPropertyDefinitions(normalized);
      } catch {
        if (!cancelled) {
          setPropertyDefinitions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceUuid]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }

    const cachedWorkspace = readCachedWorkspaces()?.find(
      (workspace) => workspace.workspaceId === workspaceUuid
    );
    if (cachedWorkspace?.name) {
      setWorkspaceName(cachedWorkspace.name);
    }

    (async () => {
      try {
        if (cachedWorkspace?.name) {
          return;
        }

        const name = await loadWorkspaceName(workspaceUuid);
        if (name) {
          setWorkspaceName(name);
        }
      } catch {
        // ignore
      }
    })().catch(() => undefined);
  }, [workspaceUuid]);

  useEffect(() => {
    if (lastRecordedRouteRef.current === currentRoute) {
      return;
    }
    lastRecordedRouteRef.current = currentRoute;
    recordRoute(currentRoute);
  }, [currentRoute, recordRoute]);

  useEffect(() => {
    window.localStorage.setItem(FILE_EXPLORER_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(
        `${FILE_RETRIEVAL_CONTEXT_KEY}:${workspaceUuid}`
      );
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        activeChunkId?: string | null;
        query?: string;
        results?: WorkspaceSearchResult[];
      };
      const parsedResults = Array.isArray(parsed.results) ? parsed.results : [];
      if (typeof parsed.query === "string") {
        setQuery((current) => (current ? "" : current));
      }
      if (parsedResults.length > 0) {
        setRetrievalResults((current) => {
          if (current.length === parsedResults.length) {
            return current;
          }
          return parsedResults;
        });
        setVectorFilteredIds((current) => (current ? null : current));
        setQuery((current) => (current ? "" : current));
      }
      if (
        typeof parsed.activeChunkId === "string" ||
        parsed.activeChunkId === null
      ) {
        setActiveRetrievalChunkId((current) =>
          current === (parsed.activeChunkId ?? null)
            ? current
            : (parsed.activeChunkId ?? null)
        );
      }
    } catch {
      // Ignore malformed client cache.
    }
  }, [workspaceUuid]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    window.sessionStorage.setItem(
      `${FILE_RETRIEVAL_CONTEXT_KEY}:${workspaceUuid}`,
      JSON.stringify({
        activeChunkId: activeRetrievalChunkId,
        query: retrievalResults.length > 0 ? query : "",
        results: retrievalResults,
      })
    );
  }, [activeRetrievalChunkId, query, retrievalResults, workspaceUuid]);

  if (
    selectedRetrievalChunkParam &&
    selectedRetrievalChunkParam !== activeRetrievalChunkId
  ) {
    setActiveRetrievalChunkId(selectedRetrievalChunkParam);
  }

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) {
      return;
    }
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

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

  const handleApplyWorkspaceFilter = useCallback((itemIds: string[] | null) => {
    setVectorFilteredIds(
      itemIds && itemIds.length > 0 ? new Set(itemIds) : null
    );
  }, []);

  const handleSearch = useCallback(
    (_searchQuery: string, results: WorkspaceSearchResult[]) => {
      setQuery("");
      setRetrievalResults(results);
      if (results.length === 0) {
        setActiveRetrievalChunkId(null);
      }
    },
    []
  );

  const handleSelectResult = useCallback(
    (result: WorkspaceSearchResult) => {
      if (result.type === "folder") {
        setActiveRetrievalChunkId(null);
        openFolderById(result.id);
        return;
      }
      setActiveRetrievalChunkId(result.chunkId ?? null);
      openSearchResult(result);
    },
    [openFolderById, openSearchResult]
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
        filePreviewRetrievalProps: buildExplorerFilePreviewRetrievalProps({
          activeRetrievalChunkId,
          query,
          retrievalResults,
        }),
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
  const searchBarProps = buildExplorerSearchBarProps({
    activeRetrievalChunkId,
    focusSearchSignal,
    handleApplyWorkspaceFilter,
    handleSearch,
    handleSelectResult,
    onOpenFileById: openFileById,
    onOpenFolderById: openFolderById,
    query,
    retrievalResults,
    searchableItems,
    workspaceUuid,
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
