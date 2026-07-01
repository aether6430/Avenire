"use client";

import { Button } from "@avenire/ui/components/button";
import { ButtonGroup } from "@avenire/ui/components/button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avenire/ui/components/popover";
import { Spinner } from "@avenire/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@avenire/ui/components/tabs";
import { FileMediaPlayer } from "@avenire/ui/media";
import {
  DownloadSimple as ArrowDownToLine,
  ArrowUp,
  Columns as Columns3,
  Copy,
  FileImage,
  FileText,
  FolderPlus as FolderInput,
  Globe,
  Info,
  LinkSimple,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  Plus,
  ArrowCounterClockwise as RotateCcw,
  ShareNetwork as Share2,
  SlidersHorizontal,
  Trash as Trash2,
  X,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/chat/markdown";
import type { WorkspaceInvalidationDetail } from "@/components/dashboard/workspace-realtime-bridge";
import AvenireEditor from "@/components/editor";
import { PropertiesTable } from "@/components/editor/properties-table";
import type {
  FileRecord,
  FolderRecord,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import {
  detectPreviewKind,
  toUpdatedLabel,
} from "@/components/files/explorer/shared";
import { PanPinchImageViewer } from "@/components/files/pan-pinch-image-viewer";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import {
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
} from "@/lib/file-preview-cache";
import {
  arePageMetadataStatesEqual,
  EMPTY_PAGE_METADATA_STATE,
  normalizePageMetadataState,
  type PageMetadataState,
  type WorkspacePropertyDefinition,
} from "@/lib/frontmatter";
import { getMarkdownDisplayTitle } from "@/lib/markdown-title";
import {
  buildProgressivePlaybackSource,
  buildVideoPlaybackDescriptor,
} from "@/lib/media-playback";
import { cn } from "@/lib/utils";
import {
  readWorkspaceMarkdownCache,
  writeWorkspaceMarkdownCache,
} from "@/lib/workspace-markdown-cache";
import { useCurrentWorkspacePane } from "@/lib/workspace-panes";
import { usePaneHeaderActions } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border/70 bg-card text-sm">
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        Loading PDF...
      </div>
    </div>
  ),
  ssr: false,
});

const OfficeViewer = dynamic(() => import("@/components/files/office-viewer"), {
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border/70 bg-card text-sm">
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        Loading preview...
      </div>
    </div>
  ),
  ssr: false,
});

import { STATIC_ASSETS } from "@/lib/static-assets";

const DEFAULT_NOTE_COVER_URL = STATIC_ASSETS.banner1;

function normalizeFilePageIcon(icon: string | null | undefined) {
  if (typeof icon !== "string") {
    return null;
  }

  const trimmed = icon.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }

  return trimmed.slice(0, 8);
}

function isRenderableIconUrl(icon: string) {
  return (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/") ||
    icon.startsWith("data:image/")
  );
}

type LinkPreviewDisplayMode = "embed" | "reader" | "snapshot";

interface LinkPreviewMetadata {
  description: string | null;
  displayMode: LinkPreviewDisplayMode;
  favicon: string | null;
  imageUrl: string | null;
  kind: string | null;
  mediaUrls: string[];
  provider: string | null;
  readerMarkdown: string | null;
  snapshot: {
    capturedAt: string | null;
    contentText: string | null;
    description: string | null;
    imageUrl: string | null;
    title: string | null;
  } | null;
  sourceUrl: string;
  title: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeLinkDisplayMode(
  value: string | null
): LinkPreviewDisplayMode {
  if (value === "embed" || value === "reader" || value === "snapshot") {
    return value;
  }
  return "snapshot";
}

function getLinkPreviewMetadata(file: FileRecord): LinkPreviewMetadata | null {
  const metadata = asRecord(file.metadata);
  const link = metadata ? asRecord(metadata.link) : null;
  const sourceUrl = link ? readString(link, "sourceUrl") : null;
  if (!(link && sourceUrl)) {
    return null;
  }

  const snapshotRecord = asRecord(link.snapshot);
  return {
    description: readString(link, "description"),
    displayMode: normalizeLinkDisplayMode(readString(link, "displayMode")),
    favicon: readString(link, "favicon"),
    imageUrl: readString(link, "imageUrl"),
    kind: readString(link, "kind"),
    mediaUrls: readStringArray(link, "mediaUrls"),
    provider: readString(link, "provider"),
    readerMarkdown: readString(link, "readerMarkdown"),
    snapshot: snapshotRecord
      ? {
          capturedAt: readString(snapshotRecord, "capturedAt"),
          contentText: readString(snapshotRecord, "contentText"),
          description: readString(snapshotRecord, "description"),
          imageUrl: readString(snapshotRecord, "imageUrl"),
          title: readString(snapshotRecord, "title"),
        }
      : null,
    sourceUrl,
    title: readString(link, "title"),
  };
}

function LinkResourcePreview({
  fileName,
  preview,
  workspaceUuid,
}: {
  fileName: string;
  preview: LinkPreviewMetadata;
  workspaceUuid: string;
}) {
  const title = preview.title || fileName.replace(/\.mdx?$/i, "");
  const description =
    preview.description ?? preview.snapshot?.description ?? preview.sourceUrl;
  const readerMarkdown =
    preview.readerMarkdown ??
    (preview.snapshot?.contentText
      ? `# ${preview.snapshot.title ?? title}\n\n${preview.snapshot.contentText}`
      : null);
  const imageUrl = preview.imageUrl ?? preview.snapshot?.imageUrl;
  const capturedAt = preview.snapshot?.capturedAt
    ? new Date(preview.snapshot.capturedAt).toLocaleString()
    : null;
  const canShowWebPreview =
    preview.displayMode === "embed" ||
    (preview.kind === "article" && preview.sourceUrl.length > 0);
  const canShowReader = Boolean(readerMarkdown);
  const [viewMode, setViewMode] = useState<"reader" | "web">(() =>
    canShowWebPreview ? "web" : "reader"
  );
  const activeViewMode =
    viewMode === "web" && !canShowWebPreview ? "reader" : viewMode;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 py-6 sm:px-8">
      <div className="flex min-w-0 items-start gap-3">
        {preview.favicon ? (
          <span
            aria-hidden="true"
            className="mt-1 size-8 rounded-md border border-border/70 bg-background bg-center bg-contain bg-no-repeat"
            style={{
              backgroundImage: `url(${JSON.stringify(preview.favicon)})`,
            }}
          />
        ) : (
          <div className="mt-1 flex size-8 items-center justify-center rounded-md border border-border/70 bg-muted text-muted-foreground">
            <LinkSimple className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <span className="capitalize">
              {preview.kind ?? preview.displayMode} preview
            </span>
            {preview.provider ? <span>{preview.provider}</span> : null}
            {capturedAt ? <span>Captured {capturedAt}</span> : null}
          </div>
          <h2 className="mt-1 text-balance font-semibold text-2xl text-foreground">
            {title}
          </h2>
          <p className="mt-2 break-words text-muted-foreground text-sm">
            {description}
          </p>
          <Button
            className="mt-4 h-8 gap-2"
            onClick={() =>
              window.open(preview.sourceUrl, "_blank", "noopener,noreferrer")
            }
            size="sm"
            type="button"
            variant="secondary"
          >
            <LinkSimple className="size-3.5" />
            Open source
          </Button>
        </div>
      </div>

      {canShowWebPreview && canShowReader ? (
        <Tabs
          className="items-start"
          onValueChange={(value) => {
            if (value === "web" || value === "reader") {
              setViewMode(value);
            }
          }}
          value={activeViewMode}
        >
          <TabsList
            className="rounded-md border border-border/70 bg-background/80"
            variant="default"
          >
            <TabsTrigger className="h-7 gap-1.5 px-2.5" value="web">
              <Globe className="size-3.5" />
              Web
            </TabsTrigger>
            <TabsTrigger className="h-7 gap-1.5 px-2.5" value="reader">
              <FileText className="size-3.5" />
              Reader
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {canShowWebPreview && activeViewMode === "web" ? (
        <div className="h-[72vh] min-h-[520px] overflow-hidden rounded-md border border-border/70 bg-background shadow-sm">
          <div className="flex h-9 items-center gap-2 border-border/70 border-b bg-muted/35 px-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/35" />
              <span className="size-2.5 rounded-full bg-muted-foreground/25" />
              <span className="size-2.5 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="min-w-0 flex-1 truncate rounded-sm border border-border/60 bg-background/70 px-2 py-1 text-muted-foreground text-xs">
              {preview.sourceUrl}
            </div>
          </div>
          <iframe
            className="h-[calc(100%-2.25rem)] w-full bg-background"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-popups"
            src={preview.sourceUrl}
            title={title}
          />
        </div>
      ) : null}

      {preview.displayMode === "snapshot" && activeViewMode !== "reader" ? (
        <div className="overflow-hidden rounded-md border border-border/70 bg-card">
          {imageUrl ? (
            <span
              aria-hidden="true"
              className="block aspect-[16/7] w-full bg-center bg-cover"
              style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
            />
          ) : (
            <div className="flex aspect-[16/7] w-full items-center justify-center bg-muted">
              <div className="max-w-md px-6 text-center">
                <LinkSimple className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground text-sm">
                  Snapshot metadata is stored for this page. A captured image
                  can be attached when the browser screenshot worker is added.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {readerMarkdown && activeViewMode === "reader" ? (
        <div className="rounded-md border border-border/70 bg-background px-5 py-8 shadow-sm sm:px-10">
          <Markdown
            className="mx-auto max-w-[720px] text-[15px] leading-7 [&_blockquote]:border-muted-foreground/35 [&_h1]:text-3xl [&_h1]:leading-tight [&_h2]:mt-10 [&_h2]:text-2xl [&_img]:rounded [&_li]:my-1 [&_p]:my-4"
            content={readerMarkdown}
            id={`link-preview-${preview.sourceUrl}`}
            textSize="default"
            workspaceUuid={workspaceUuid}
          />
        </div>
      ) : null}
    </div>
  );
}

interface NoteSyncLoadResponse {
  markdown?: string;
  updatedAt?: string | null;
  version?: number;
}

interface NoteSyncSaveResponse {
  hasConflict?: boolean;
  merged?: string;
  updatedAt?: string | null;
}

async function loadMarkdownNote(fileId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/notes/${fileId}/sync`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Unable to load note (${response.status})`);
  }

  return (await response.json().catch(() => ({}))) as NoteSyncLoadResponse;
}

async function syncMarkdownNote(
  fileId: string,
  input: { base: string; current: string }
) {
  const response = await fetch(`/api/notes/${fileId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Unable to sync note.");
  }

  return (await response.json().catch(() => ({}))) as NoteSyncSaveResponse;
}

function createGradientBannerDataUrl(from: string, to: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 420" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="1600" height="420" fill="url(#g)"/></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const NOTE_COVER_GALLERY = [
  {
    label: "Default",
    url: DEFAULT_NOTE_COVER_URL,
  },
  {
    label: "Warm",
    url: createGradientBannerDataUrl("#ef5350", "#f6c453"),
  },
  {
    label: "Ocean",
    url: createGradientBannerDataUrl("#2f95ca", "#3bb1dc"),
  },
  {
    label: "Paper",
    url: createGradientBannerDataUrl("#e8d8cc", "#f4ecde"),
  },
  {
    label: "Mint",
    url: createGradientBannerDataUrl("#5abfc0", "#93d1c0"),
  },
] as const;

interface FilePreviewPanelProps {
  activeFile: FileRecord;
  activeRetrievalChunkId: string | null;
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  currentFolderId: string;
  currentInfoEntries: { label: string; value: string }[];
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
  filePathById: Map<string, string>;
  hardReingestContextActionItems: (itemId: string) => void;
  isCurrentPinned: boolean;
  moveContextActionItemsToFolder: (
    itemId: string,
    kind: "file" | "folder",
    targetFolderId: string
  ) => void;
  openFileById: (fileId: string) => void;
  openFileShareDialog: (file: FileRecord) => void;
  openRenameFileDialog: (file: FileRecord) => void;
  propertyDefinitions: WorkspacePropertyDefinition[];
  query: string;
  retrievalResults: WorkspaceSearchResult[];
  selectFile: (fileId: string | null) => void;
  setPropertyDefinitions: (definitions: WorkspacePropertyDefinition[]) => void;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
  toggleCurrentPinnedItem: () => void;
  wikiLinkableFiles: Array<{
    id: string;
    title: string;
    excerpt: string;
    content: string;
  }>;
  workspaceMembers: WorkspaceMemberRecord[];
  workspaceUuid: string;
}

export function FilePreviewPanel({
  activeFile,
  workspaceUuid,
  allFiles,
  allFolders,
  query,
  retrievalResults,
  activeRetrievalChunkId,
  selectFile,
  openFileById,
  openRenameFileDialog,
  deleteContextActionItems,
  moveContextActionItemsToFolder,
  duplicateContextActionItems,
  downloadContextActionItems,
  openFileShareDialog,
  hardReingestContextActionItems,
  toggleCurrentPinnedItem,
  isCurrentPinned,
  currentInfoEntries,
  wikiLinkableFiles,
  startBannerUpload,
  propertyDefinitions,
  setPropertyDefinitions,
}: FilePreviewPanelProps) {
  const filePreviewScrollRef = useRef<HTMLDivElement | null>(null);
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [markdownOriginal, setMarkdownOriginal] = useState("");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [noteBaseContent, setNoteBaseContent] = useState("");
  const [noteSaveState, setNoteSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [notePage, setNotePage] = useState<PageMetadataState>(
    EMPTY_PAGE_METADATA_STATE
  );
  const [notePageOriginal, setNotePageOriginal] = useState<PageMetadataState>(
    EMPTY_PAGE_METADATA_STATE
  );
  const [_noteRemoteUpdatedAt, setNoteRemoteUpdatedAt] = useState<
    string | null
  >(null);
  const [noteBannerUploadBusy, setNoteBannerUploadBusy] = useState(false);
  const [pdfInvertColors, setPdfInvertColors] = useState(true);
  const [loadedMarkdownFileId, setLoadedMarkdownFileId] = useState<
    string | null
  >(null);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [mediaStreamFailed, setMediaStreamFailed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [noteCoverPickerTab, setNoteCoverPickerTab] = useState<
    "gallery" | "link" | "upload"
  >("gallery");
  const [noteCoverLinkDraft, setNoteCoverLinkDraft] = useState("");
  const noteBannerInputRef = useRef<HTMLInputElement | null>(null);
  const noteSyncDebounceRef = useRef<number | null>(null);
  const noteSyncInFlightRef = useRef(false);
  const noteSyncQueuedRef = useRef(false);
  const { paneId } = useCurrentWorkspacePane();
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const openTab = useWorkspacePaneStore((state) => state.openTab);
  const paneCount = useWorkspacePaneStore((state) => state.panes.length);
  const canClosePane = paneCount > 1;

  const activeFileIsMarkdown = detectPreviewKind(activeFile).isMarkdown;
  const activeCustomIcon = normalizeFilePageIcon(activeFile.page?.icon);
  const activeLinkPreview = useMemo(
    () => getLinkPreviewMetadata(activeFile),
    [activeFile]
  );
  const activeFileSourceUrl = activeFileIsMarkdown
    ? (activeLinkPreview?.sourceUrl ??
      `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`)
    : activeFile.storageUrl;
  const activePageFromFile = useMemo(
    () => normalizePageMetadataState(activeFile.page),
    [
      activeFile.page?.bannerUrl ?? null,
      activeFile.page?.icon ?? null,
      JSON.stringify(activeFile.page?.properties ?? {}),
    ]
  );
  const activePageFromFileRef = useRef(activePageFromFile);
  useEffect(() => {
    activePageFromFileRef.current = activePageFromFile;
  }, [activePageFromFile]);
  const activeFileUpdatedAt = activeFile.updatedAt ?? null;
  const noteDisplayTitle = useMemo(
    () => activeFile.name.replace(/\.mdx?$/i, ""),
    [activeFile.name]
  );
  const markdownDisplayTitle = useMemo(
    () =>
      getMarkdownDisplayTitle(markdownDraft, noteDisplayTitle).trim() ||
      noteDisplayTitle,
    [markdownDraft, noteDisplayTitle]
  );
  const cachedMarkdown = useMemo(
    () =>
      workspaceUuid && activeFileIsMarkdown
        ? readWorkspaceMarkdownCache(workspaceUuid, activeFile.id)
        : null,
    [activeFile.id, activeFileIsMarkdown, workspaceUuid]
  );
  const matchingCachedMarkdown = useMemo(
    () =>
      cachedMarkdown && cachedMarkdown.updatedAt === activeFileUpdatedAt
        ? cachedMarkdown
        : null,
    [activeFileUpdatedAt, cachedMarkdown]
  );

  useLayoutEffect(() => {
    if (loadedMarkdownFileId === activeFile.id && activeFileIsMarkdown) {
      return;
    }

    if (!(workspaceUuid && activeFileIsMarkdown)) {
      setLoadedMarkdownFileId(null);
      setMarkdownLoading(false);
      setMarkdownError(null);
      setMarkdownOriginal("");
      setMarkdownDraft("");
      setNoteBaseContent("");
      setNotePage(activePageFromFile);
      setNotePageOriginal(activePageFromFile);
      setNoteCoverLinkDraft(activePageFromFile.bannerUrl?.trim() ?? "");
      setNoteRemoteUpdatedAt(activeFileUpdatedAt);
      return;
    }

    if (matchingCachedMarkdown) {
      setMarkdownLoading(false);
      setMarkdownError(null);
      setMarkdownOriginal(matchingCachedMarkdown.body);
      setMarkdownDraft(matchingCachedMarkdown.body);
      setNoteBaseContent(matchingCachedMarkdown.body);
      setNotePage(matchingCachedMarkdown.page);
      setNotePageOriginal(matchingCachedMarkdown.page);
      setNoteCoverLinkDraft(
        matchingCachedMarkdown.page.bannerUrl?.trim() ?? ""
      );
      setNoteRemoteUpdatedAt(
        matchingCachedMarkdown.updatedAt ?? activeFileUpdatedAt
      );
      setLoadedMarkdownFileId(activeFile.id);
      return;
    }

    setLoadedMarkdownFileId(null);
    setMarkdownLoading(true);
    setMarkdownError(null);
    setMarkdownOriginal("");
    setMarkdownDraft("");
    setNoteBaseContent("");
    setNotePage(activePageFromFile);
    setNotePageOriginal(activePageFromFile);
    setNoteCoverLinkDraft(activePageFromFile.bannerUrl?.trim() ?? "");
    setNoteRemoteUpdatedAt(activeFileUpdatedAt);
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    activePageFromFile,
    activeFileUpdatedAt,
    matchingCachedMarkdown,
    loadedMarkdownFileId,
    workspaceUuid,
  ]);

  useEffect(() => {
    if (!(workspaceUuid && activeFileIsMarkdown)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const hasWarmMarkdown =
      loadedMarkdownFileId === activeFile.id || Boolean(matchingCachedMarkdown);

    if (!hasWarmMarkdown) {
      setMarkdownLoading(true);
    }
    setMarkdownError(null);

    loadMarkdownNote(activeFile.id, controller.signal)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const markdown = payload.markdown ?? "";
        setMarkdownOriginal(markdown);
        setMarkdownDraft(markdown);
        setNoteBaseContent(markdown);
        setNoteRemoteUpdatedAt(payload.updatedAt ?? null);
        setNoteCoverLinkDraft(
          activePageFromFileRef.current.bannerUrl?.trim() ?? ""
        );
        setLoadedMarkdownFileId(activeFile.id);
        writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
          body: markdown,
          content: markdown,
          page: activePageFromFileRef.current,
          updatedAt: payload.updatedAt ?? null,
        });
      })
      .catch((error) => {
        if (cancelled || (error as { name?: string })?.name === "AbortError") {
          return;
        }
        setMarkdownError(
          error instanceof Error ? error.message : "Unable to load note."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setMarkdownLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (noteSyncDebounceRef.current) {
        window.clearTimeout(noteSyncDebounceRef.current);
      }
    };
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    loadedMarkdownFileId,
    matchingCachedMarkdown,
    workspaceUuid,
  ]);

  useEffect(() => {
    setPropertiesOpen(false);
  }, [activeFile.id]);

  const markdownBody = markdownDraft;
  const isMarkdownReady = loadedMarkdownFileId === activeFile.id;
  const markdownDirty = markdownBody !== markdownOriginal;
  const notePageDirty = useMemo(
    () => !arePageMetadataStatesEqual(notePage, notePageOriginal),
    [notePage, notePageOriginal]
  );
  const latestMarkdownBodyRef = useRef(markdownBody);
  const latestNoteBaseContentRef = useRef(noteBaseContent);
  const latestNotePageRef = useRef(notePage);

  useEffect(() => {
    latestMarkdownBodyRef.current = markdownBody;
    latestNoteBaseContentRef.current = noteBaseContent;
    latestNotePageRef.current = notePage;
  }, [markdownBody, noteBaseContent, notePage]);

  const handleMarkdownBodyChange = useCallback((nextBody: string) => {
    setMarkdownDraft(nextBody);
  }, []);

  const runNoteSync = useCallback(async () => {
    const payload = await syncMarkdownNote(activeFile.id, {
      base: latestNoteBaseContentRef.current,
      current: latestMarkdownBodyRef.current,
    });
    const current = latestMarkdownBodyRef.current;
    const merged = payload.merged ?? current;

    setNoteBaseContent(merged);
    setNoteRemoteUpdatedAt(payload.updatedAt ?? null);
    if (payload.hasConflict) {
      setMarkdownOriginal(current);
    } else {
      setMarkdownOriginal(merged);
      if (merged !== current) {
        setMarkdownDraft(merged);
      }
    }
    writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
      body: payload.hasConflict ? current : merged,
      content: payload.hasConflict ? current : merged,
      page: latestNotePageRef.current,
      updatedAt: payload.updatedAt ?? null,
    });

    if (payload.hasConflict) {
      toast.message("Note merged with remote changes.");
    }
  }, [activeFile.id, workspaceUuid]);

  useEffect(() => {
    if (
      !activeFileIsMarkdown ||
      activeFile.readOnly ||
      loadedMarkdownFileId !== activeFile.id
    ) {
      return;
    }

    if (!markdownDirty) {
      return;
    }

    const syncNote = async () => {
      if (noteSyncInFlightRef.current) {
        noteSyncQueuedRef.current = true;
        return;
      }

      noteSyncInFlightRef.current = true;
      setNoteSaveState("saving");

      try {
        await runNoteSync();
        setNoteSaveState("saved");
      } catch {
        setNoteSaveState("error");
      } finally {
        noteSyncInFlightRef.current = false;
        if (noteSyncQueuedRef.current) {
          noteSyncQueuedRef.current = false;
          if (noteSyncDebounceRef.current) {
            window.clearTimeout(noteSyncDebounceRef.current);
          }
          noteSyncDebounceRef.current = window.setTimeout(() => {
            void syncNote();
          }, 1200);
        }
      }
    };

    if (noteSyncDebounceRef.current) {
      window.clearTimeout(noteSyncDebounceRef.current);
    }

    noteSyncDebounceRef.current = window.setTimeout(() => {
      void syncNote();
    }, 1200);

    return () => {
      if (noteSyncDebounceRef.current) {
        window.clearTimeout(noteSyncDebounceRef.current);
      }
    };
  }, [
    activeFile.id,
    activeFile.readOnly,
    activeFileIsMarkdown,
    loadedMarkdownFileId,
    markdownBody,
    markdownDirty,
    noteBaseContent,
    runNoteSync,
  ]);

  const fileMetadataSaveTimerRef = useRef<number | null>(null);

  const saveFileMetadata = useCallback(async () => {
    if (activeFile.readOnly || !notePageDirty) {
      return;
    }

    const endpoint = activeFileIsMarkdown
      ? `/api/notes/${activeFile.id}`
      : `/api/workspaces/${workspaceUuid}/files/${activeFile.id}`;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: notePage }),
    });

    if (!response.ok) {
      return;
    }

    setNotePageOriginal(notePage);
    writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
      body: markdownBody,
      content: markdownBody,
      page: notePage,
      updatedAt: activeFileUpdatedAt,
    });
  }, [
    activeFile.id,
    activeFile.readOnly,
    activeFileIsMarkdown,
    activeFileUpdatedAt,
    markdownBody,
    notePage,
    notePageDirty,
    workspaceUuid,
  ]);

  useEffect(() => {
    if (activeFile.readOnly) {
      return;
    }

    if (!notePageDirty) {
      return;
    }

    if (fileMetadataSaveTimerRef.current) {
      window.clearTimeout(fileMetadataSaveTimerRef.current);
    }

    fileMetadataSaveTimerRef.current = window.setTimeout(() => {
      void saveFileMetadata();
    }, 800);

    return () => {
      if (fileMetadataSaveTimerRef.current) {
        window.clearTimeout(fileMetadataSaveTimerRef.current);
      }
    };
  }, [activeFile.readOnly, notePageDirty, saveFileMetadata]);

  useEffect(() => {
    if (!(workspaceUuid && activeFileIsMarkdown)) {
      return;
    }

    const handleWorkspaceInvalidation = (event: Event) => {
      const detail = (
        event as CustomEvent<WorkspaceInvalidationDetail | undefined>
      ).detail;

      if (
        detail?.kind !== "files" ||
        detail.workspaceUuid !== workspaceUuid ||
        (detail.payload?.fileId && detail.payload.fileId !== activeFile.id)
      ) {
        return;
      }

      if (
        latestMarkdownBodyRef.current !== markdownOriginal ||
        noteSyncInFlightRef.current
      ) {
        return;
      }

      void loadMarkdownNote(activeFile.id)
        .then((payload) => {
          const markdown = payload.markdown ?? "";
          setMarkdownOriginal(markdown);
          setMarkdownDraft(markdown);
          setNoteBaseContent(markdown);
          setNoteRemoteUpdatedAt(payload.updatedAt ?? null);
          setLoadedMarkdownFileId(activeFile.id);
          writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
            body: markdown,
            content: markdown,
            page: latestNotePageRef.current,
            updatedAt: payload.updatedAt ?? null,
          });
        })
        .catch(() => undefined);
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      handleWorkspaceInvalidation as EventListener
    );

    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        handleWorkspaceInvalidation as EventListener
      );
    };
  }, [activeFile.id, activeFileIsMarkdown, markdownOriginal, workspaceUuid]);

  useEffect(() => {
    setNoteSaveState("idle");
    setNotePage(activePageFromFile);
    setNotePageOriginal(activePageFromFile);
    setNoteCoverLinkDraft(activePageFromFile.bannerUrl?.trim() ?? "");
    setNoteRemoteUpdatedAt(activeFileUpdatedAt);
  }, [activeFile.id, activeFileUpdatedAt, activePageFromFile]);

  useEffect(() => {
    if (noteSaveState !== "saved" && noteSaveState !== "error") {
      return;
    }

    const delay = noteSaveState === "saved" ? 1500 : 4000;
    const timer = window.setTimeout(() => {
      setNoteSaveState("idle");
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [noteSaveState]);

  const noteBannerUrl =
    notePage.bannerUrl?.trim() && notePage.bannerUrl.trim().length > 0
      ? notePage.bannerUrl.trim()
      : null;

  const setNoteCoverUrl = useCallback((url: string | null) => {
    setNoteCoverLinkDraft(url ?? "");
    setNotePage((current) => ({
      ...current,
      bannerUrl: url,
    }));
  }, []);

  const applyDefaultNoteCover = useCallback(() => {
    if (!activeFileIsMarkdown || activeFile.readOnly) {
      return;
    }

    setNoteCoverUrl(DEFAULT_NOTE_COVER_URL);
  }, [activeFile.readOnly, activeFileIsMarkdown, setNoteCoverUrl]);

  const triggerNoteBannerPicker = useCallback(() => {
    if (!activeFileIsMarkdown || activeFile.readOnly || noteBannerUploadBusy) {
      return;
    }
    noteBannerInputRef.current?.click();
  }, [activeFile.readOnly, activeFileIsMarkdown, noteBannerUploadBusy]);

  const handleNoteBannerInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!(file && activeFileIsMarkdown) || activeFile.readOnly) {
        return;
      }

      setNoteBannerUploadBusy(true);
      try {
        const uploaded = ((await startBannerUpload([file])) ?? [])[0] as
          | {
              ufsUrl?: string;
              url?: string;
            }
          | undefined;
        const uploadedUrl =
          (typeof uploaded?.ufsUrl === "string" && uploaded.ufsUrl) ||
          (typeof uploaded?.url === "string" && uploaded.url) ||
          null;

        if (!uploadedUrl) {
          throw new Error("Upload returned no file metadata");
        }

        setNoteCoverUrl(uploadedUrl);
      } catch (error) {
        setMarkdownError(
          error instanceof Error ? error.message : "Unable to upload banner."
        );
      } finally {
        setNoteBannerUploadBusy(false);
      }
    },
    [
      activeFile.readOnly,
      activeFileIsMarkdown,
      setNoteCoverUrl,
      startBannerUpload,
    ]
  );

  const activeMediaStreamUrl = useMemo(() => {
    if (!(activeFile && workspaceUuid)) {
      return null;
    }
    return `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`;
  }, [activeFile, workspaceUuid]);
  const activeMediaSrc = useMemo(() => {
    if (!activeMediaStreamUrl) {
      return null;
    }
    return activeMediaStreamUrl;
  }, [activeMediaStreamUrl]);
  const activePlaybackDescriptor = useMemo(() => {
    if (!(activeFile && activeMediaSrc)) {
      return null;
    }
    return buildVideoPlaybackDescriptor({
      fallbackUrl: activeMediaSrc,
      mimeType: activeFile.mimeType,
      videoDelivery: mediaStreamFailed ? null : activeFile.videoDelivery,
    });
  }, [activeFile, activeMediaSrc, mediaStreamFailed]);
  const activeVideoCaptionsSrc = useMemo(() => {
    if (!(activeFile && workspaceUuid)) {
      return undefined;
    }
    const isVideo = (activeFile.mimeType ?? "")
      .toLowerCase()
      .startsWith("video/");
    if (!isVideo) {
      return undefined;
    }
    return `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/captions.vtt`;
  }, [activeFile, workspaceUuid]);

  const activeFileRetrievalResults = useMemo(() => {
    return retrievalResults.filter(
      (result) => (result.fileId ?? result.id) === activeFile.id
    );
  }, [activeFile, retrievalResults]);
  const activeRetrievalResult = useMemo(() => {
    if (activeFileRetrievalResults.length === 0) {
      return null;
    }
    if (activeRetrievalChunkId) {
      return (
        activeFileRetrievalResults.find(
          (result) => result.chunkId === activeRetrievalChunkId
        ) ?? activeFileRetrievalResults[0]
      );
    }
    return activeFileRetrievalResults[0] ?? null;
  }, [activeFileRetrievalResults, activeRetrievalChunkId]);

  useEffect(() => {
    setVideoLoadFailed(false);
    setAudioLoadFailed(false);
    setMediaStreamFailed(false);
    setPdfInvertColors(true);
  }, [activeFile.id]);

  useEffect(() => {
    markFileOpened(activeFile.id);
    const { isAudio, isVideo } = detectPreviewKind(activeFile);
    if (!(isAudio || isVideo)) {
      return;
    }

    const playbackSource = isVideo
      ? (activePlaybackDescriptor?.preferredSource ?? null)
      : activeMediaSrc
        ? buildProgressivePlaybackSource(activeMediaSrc, activeFile.mimeType)
        : null;
    if (!playbackSource) {
      return;
    }

    void primeMediaPlayback(playbackSource, {
      mediaType: isVideo ? "video" : "audio",
      posterUrl: isVideo ? activePlaybackDescriptor?.posterUrl : null,
      sizeBytes: activeFile.sizeBytes,
      surface: "viewer",
    });
    return () => {
      releaseMediaPlaybackPrime(playbackSource);
    };
  }, [activeFile, activeMediaSrc, activePlaybackDescriptor]);

  const {
    isAudio,
    isDocument,
    isImage,
    isPdf,
    isPresentation,
    isSpreadsheet,
    isVideo,
    isMarkdown,
  } = detectPreviewKind(activeFile);
  const isOfficePreview = isDocument || isPresentation || isSpreadsheet;
  const isOpenedCached = isFileOpenedCached(activeFile.id);
  const activeAudioPlaybackSource = buildProgressivePlaybackSource(
    activeMediaSrc ?? activeFile.storageUrl,
    activeFile.mimeType
  );
  const isPreferredVideoSourceWarm = activePlaybackDescriptor
    ? getWarmState(activePlaybackDescriptor.preferredSource) === "warm"
    : false;
  const shouldUsePreferredVideoSource =
    isOpenedCached || isPreferredVideoSourceWarm;
  const activeVideoPlaybackSource = activePlaybackDescriptor
    ? activePlaybackDescriptor.preferredSource
    : buildProgressivePlaybackSource(
        activeMediaSrc ?? activeFile.storageUrl,
        activeFile.mimeType
      );

  const { resetHeaderContext, setHeaderContext } = usePaneHeaderActions();
  useEffect(() => {
    setHeaderContext({
      title: activeFileIsMarkdown ? markdownDisplayTitle : activeFile.name,
      leadingIcon: (
        <div className="flex size-6 items-center justify-center text-muted-foreground">
          {activeCustomIcon ? (
            isRenderableIconUrl(activeCustomIcon) ? (
              <span className="inline-flex size-5 items-center justify-center overflow-hidden rounded-[3px] bg-muted">
                <img
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={activeCustomIcon}
                />
              </span>
            ) : (
              <span className="text-base leading-none">{activeCustomIcon}</span>
            )
          ) : activeLinkPreview ? (
            <LinkSimple className="size-4" />
          ) : (
            <FileText className="size-4" />
          )}
        </div>
      ),
      breadcrumbs: (
        <div className="min-w-0 flex-1">
          <span className="truncate font-medium text-foreground">
            {activeFileIsMarkdown ? markdownDisplayTitle : activeFile.name}
          </span>
        </div>
      ),
      actions: (
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
          <span className="hidden text-muted-foreground text-xs sm:inline">
            Edited{" "}
            {toUpdatedLabel(activeFile.updatedAt ?? activeFile.createdAt)} ago
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  className="h-9 w-9 rounded-md border border-border/60 bg-background text-foreground shadow-sm hover:bg-muted/70"
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border border-border/60 bg-background shadow-md"
            >
              {isPdf ? (
                <DropdownMenuCheckboxItem
                  checked={pdfInvertColors}
                  onCheckedChange={(checked) => {
                    setPdfInvertColors(checked === true);
                  }}
                >
                  PDF dark mode
                </DropdownMenuCheckboxItem>
              ) : null}
              <DropdownMenuItem onClick={toggleCurrentPinnedItem}>
                {isCurrentPinned ? (
                  <PinOff className="size-3.5" />
                ) : (
                  <Pin className="size-3.5" />
                )}
                {isCurrentPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    activeFileSourceUrl,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <ArrowUp className="size-3.5" />
                Open in new tab
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  openRenameFileDialog(activeFile);
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  duplicateContextActionItems(activeFile.id, "file");
                }}
              >
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  openFileShareDialog(activeFile);
                }}
              >
                <Share2 className="size-3.5" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="size-3.5" />
                  Move To
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 border border-border/60 bg-background shadow-md">
                  {allFolders
                    .filter((folder) => !folder.readOnly)
                    .slice(0, 20)
                    .map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => {
                          moveContextActionItemsToFolder(
                            activeFile.id,
                            "file",
                            folder.id
                          );
                        }}
                      >
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => {
                  downloadContextActionItems(
                    activeFile.id,
                    "file",
                    activeFile.name
                  );
                }}
              >
                <ArrowDownToLine className="size-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  hardReingestContextActionItems(activeFile.id);
                }}
              >
                <RotateCcw className="size-3.5" />
                Hard Re-ingest
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  openPane("/workspace", {
                    sourcePaneId: paneId,
                    splitDirection: "horizontal",
                    splitPlacement: "after",
                  })
                }
              >
                <Columns3 className="size-3.5" />
                Split right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("file", activeFile.id);
                  openTab(
                    `/workspace/files/${workspaceUuid}/folder/${activeFile.folderId}?${params.toString()}`
                  );
                }}
              >
                <Plus className="size-3.5" />
                Open in workspace tab
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canClosePane}
                onClick={() => closePane(paneId)}
              >
                <X className="size-3.5" />
                Close pane
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Info className="size-3.5" />
                  Metadata
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 border border-border/60 bg-background shadow-md">
                  <div className="px-2 pt-1 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                    Info
                  </div>
                  {currentInfoEntries.map((entry) => (
                    <div
                      className="flex items-start justify-between gap-3 px-2 py-1.5 text-xs"
                      key={entry.label}
                    >
                      <span className="text-muted-foreground">
                        {entry.label}
                      </span>
                      <span className="max-w-[12rem] text-right text-foreground">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  deleteContextActionItems(activeFile.id, "file");
                }}
                variant="destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    });

    return () => {
      resetHeaderContext();
    };
  }, [
    activeFile,
    activeFileSourceUrl,
    activeFile.createdAt,
    activeFile.folderId,
    activeFile.id,
    activeCustomIcon,
    activeFile.name,
    activeFile.readOnly,
    activeLinkPreview,
    allFolders,
    currentInfoEntries,
    openFileShareDialog,
    closePane,
    canClosePane,
    isCurrentPinned,
    isMarkdown,
    noteBannerUploadBusy,
    noteBannerUrl,
    notePage,
    propertiesOpen,
    propertyDefinitions,
    handleNoteBannerInputChange,
    openRenameFileDialog,
    resetHeaderContext,
    setPropertyDefinitions,
    setHeaderContext,
    triggerNoteBannerPicker,
    toggleCurrentPinnedItem,
    openPane,
    openTab,
    paneId,
    workspaceUuid,
    isImage,
    isOfficePreview,
    isPdf,
    isVideo,
    activeFileIsMarkdown,
    markdownDisplayTitle,
  ]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Dialog onOpenChange={setPropertiesOpen} open={propertiesOpen}>
        <DialogContent className="max-w-[calc(100vw-1rem)] overflow-visible rounded-lg border border-border/60 bg-background p-0 shadow-md sm:max-w-[26rem]">
          <DialogHeader className="border-border/60 border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
              <SlidersHorizontal className="size-3" />
              Properties
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-visible p-3.5">
            <PropertiesTable
              className="mx-0 mb-0 max-w-none border-0 px-0 pt-0 pb-0 sm:px-0"
              definitions={propertyDefinitions}
              disabled={activeFile.readOnly}
              onChange={(properties) => {
                setNotePage((current) => ({
                  ...current,
                  properties,
                }));
              }}
              onDefinitionsChange={setPropertyDefinitions}
              properties={notePage.properties}
            />
            {activeFileIsMarkdown ? (
              <input
                accept="image/*"
                className="hidden"
                onChange={handleNoteBannerInputChange}
                ref={noteBannerInputRef}
                type="file"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      {isMarkdown ? (
        <div
          className="markdown-note-preview no-scrollbar min-h-0 w-full flex-1 overflow-auto"
          ref={filePreviewScrollRef}
        >
          <div className="min-h-full w-full min-w-0">
            {markdownError ? (
              <div className="mx-auto flex h-[70vh] max-w-[820px] flex-col items-center justify-center gap-3 p-0 text-center sm:p-4">
                <FileText className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">{markdownError}</p>
              </div>
            ) : markdownLoading || !isMarkdownReady ? (
              <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
                <div className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Loading markdown...
                </div>
              </div>
            ) : (
              <div className="flex min-h-full w-full min-w-0 flex-col items-stretch">
                {activeFileIsMarkdown ? (
                  <div className="w-full min-w-0 bg-background">
                    {noteBannerUrl ? (
                      <div className="group/banner relative w-full overflow-hidden border-border/60 bg-muted/30">
                        <div className="absolute inset-0 border-border/60 sm:border-y" />
                        <img
                          alt={`${activeFile.name} cover`}
                          className="h-32 w-full object-cover sm:h-40"
                          key={noteBannerUrl}
                          loading="lazy"
                          onError={(event) => {
                            const img = event.currentTarget;
                            if (img.dataset.fellBack) return;
                            img.dataset.fellBack = "1";
                            img.src = STATIC_ASSETS.banner1;
                          }}
                          src={noteBannerUrl}
                        />
                        <div className="pointer-events-none absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-focus-within/banner:opacity-100 group-hover/banner:opacity-100">
                          <div className="pointer-events-auto">
                            <ButtonGroup className="divide-x divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background/95 shadow-sm backdrop-blur-0">
                              <Popover>
                                <PopoverTrigger
                                  render={
                                    <Button
                                      className="h-8 rounded-none border-0 bg-transparent px-3 font-medium text-foreground text-xs shadow-none hover:bg-muted/70"
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    />
                                  }
                                >
                                  Change
                                </PopoverTrigger>
                                <PopoverContent
                                  align="end"
                                  className="w-[min(32rem,calc(100vw-1rem))] rounded-lg border border-border/60 bg-background p-0 shadow-md"
                                  sideOffset={8}
                                >
                                  <div className="flex items-center justify-between border-border/60 border-b px-3 py-2">
                                    <Tabs
                                      onValueChange={(value) =>
                                        setNoteCoverPickerTab(
                                          value as "gallery" | "link" | "upload"
                                        )
                                      }
                                      value={noteCoverPickerTab}
                                    >
                                      <TabsList className="h-8 rounded-none bg-transparent p-0">
                                        <TabsTrigger
                                          className="rounded-none px-2.5 text-xs data-active:border-b data-active:border-b-border"
                                          value="gallery"
                                        >
                                          Gallery
                                        </TabsTrigger>
                                        <TabsTrigger
                                          className="rounded-none px-2.5 text-xs data-active:border-b data-active:border-b-border"
                                          value="link"
                                        >
                                          Link
                                        </TabsTrigger>
                                      </TabsList>
                                    </Tabs>
                                    <Button
                                      className="h-7 rounded-md px-2 text-muted-foreground text-xs hover:text-destructive"
                                      disabled={
                                        activeFile.readOnly || !noteBannerUrl
                                      }
                                      onClick={() => setNoteCoverUrl(null)}
                                      size="sm"
                                      type="button"
                                      variant="ghost"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="p-3">
                                    {noteCoverPickerTab === "gallery" ? (
                                      <div className="space-y-3">
                                        <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                                          Color & Gradient
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                          {NOTE_COVER_GALLERY.map((option) => (
                                            <button
                                              className={cn(
                                                "relative h-16 overflow-hidden rounded-md border border-border/60 transition hover:opacity-90",
                                                noteBannerUrl === option.url
                                                  ? "ring-1 ring-foreground/40"
                                                  : ""
                                              )}
                                              key={option.label}
                                              onClick={() =>
                                                setNoteCoverUrl(option.url)
                                              }
                                              type="button"
                                            >
                                              <img
                                                alt={option.label}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                                src={option.url}
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {noteCoverPickerTab === "upload" ? (
                                      <div className="flex min-h-32 items-center justify-center rounded-md border border-border/70 border-dashed bg-muted/20">
                                        <Button
                                          className="h-8 rounded-md px-3 text-xs"
                                          disabled={
                                            activeFile.readOnly ||
                                            noteBannerUploadBusy
                                          }
                                          onClick={triggerNoteBannerPicker}
                                          size="sm"
                                          type="button"
                                          variant="secondary"
                                        >
                                          {noteBannerUploadBusy
                                            ? "Uploading..."
                                            : "Upload image"}
                                        </Button>
                                      </div>
                                    ) : null}
                                    {noteCoverPickerTab === "link" ? (
                                      <div className="space-y-3">
                                        <input
                                          className="h-8 w-full rounded-md border border-border/60 bg-background px-2.5 text-foreground text-xs outline-none transition focus:border-foreground/30"
                                          onChange={(event) =>
                                            setNoteCoverLinkDraft(
                                              event.currentTarget.value
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key !== "Enter") {
                                              return;
                                            }

                                            event.preventDefault();
                                            const nextUrl =
                                              noteCoverLinkDraft.trim();
                                            if (!nextUrl) {
                                              return;
                                            }

                                            setNoteCoverUrl(nextUrl);
                                          }}
                                          placeholder="https://example.com/cover.png"
                                          value={noteCoverLinkDraft}
                                        />
                                        <div className="flex justify-end">
                                          <Button
                                            className="h-8 rounded-md px-3 text-xs"
                                            disabled={
                                              activeFile.readOnly ||
                                              noteCoverLinkDraft.trim()
                                                .length === 0
                                            }
                                            onClick={() =>
                                              setNoteCoverUrl(
                                                noteCoverLinkDraft.trim()
                                              )
                                            }
                                            size="sm"
                                            type="button"
                                          >
                                            Apply cover
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                className="h-8 rounded-none border-0 bg-transparent px-3 font-medium text-foreground text-xs shadow-none hover:bg-muted/70"
                                disabled={
                                  activeFile.readOnly || noteBannerUploadBusy
                                }
                                onClick={triggerNoteBannerPicker}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                {noteBannerUploadBusy
                                  ? "Uploading..."
                                  : "Upload"}
                              </Button>
                              <Button
                                className="h-8 w-8 rounded-none border-0 bg-transparent text-foreground shadow-none hover:bg-muted/70"
                                disabled={activeFile.readOnly || !noteBannerUrl}
                                onClick={applyDefaultNoteCover}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <ArrowDownToLine className="size-3.5" />
                              </Button>
                            </ButtonGroup>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-4 sm:px-8">
                      {noteBannerUrl ? null : (
                        <Button
                          className="h-7 justify-start gap-2 self-start rounded-md border-0 bg-transparent px-0 font-medium text-muted-foreground text-xs shadow-none hover:bg-transparent hover:text-foreground"
                          disabled={activeFile.readOnly}
                          onClick={applyDefaultNoteCover}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <FileImage className="size-3.5" />
                          Add cover
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="w-full min-w-0">
                  {activeLinkPreview ? (
                    <LinkResourcePreview
                      fileName={activeFile.name}
                      key={`${activeFile.id}:${activeLinkPreview.sourceUrl}`}
                      preview={activeLinkPreview}
                      workspaceUuid={workspaceUuid}
                    />
                  ) : (
                    <AvenireEditor
                      defaultValue={markdownBody}
                      key={`${activeFile.id}:${_noteRemoteUpdatedAt ?? activeFileUpdatedAt ?? loadedMarkdownFileId}`}
                      noteTitle={noteDisplayTitle}
                      onChange={handleMarkdownBodyChange}
                      onOpenWikiLink={(page, options) => {
                        if (!options.openInNewPane) {
                          openFileById(page.id);
                          return;
                        }

                        const targetFile = allFiles.find(
                          (file) => file.id === page.id
                        );
                        if (!targetFile) {
                          return;
                        }

                        const params = new URLSearchParams();
                        params.set("file", page.id);
                        openPane(
                          `/workspace/files/${workspaceUuid}/folder/${targetFile.folderId}?${params.toString()}`,
                          { sourcePaneId: paneId }
                        );
                      }}
                      onPagePropertiesChange={(properties) => {
                        setNotePage((current) => ({
                          ...current,
                          properties,
                        }));
                      }}
                      onPropertyDefinitionsChange={setPropertyDefinitions}
                      pageProperties={notePage.properties}
                      propertyDefinitions={propertyDefinitions}
                      saveState={
                        activeFileIsMarkdown ? noteSaveState : undefined
                      }
                      scrollContainerRef={filePreviewScrollRef}
                      wikiPages={wikiLinkableFiles}
                      workspaceUuid={workspaceUuid}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isPdf ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <PDFViewer
            className="h-full min-h-0 rounded-none border-0 sm:rounded-xl sm:border sm:border-border/70"
            fallbackHighlightText={query}
            highlightPage={activeRetrievalResult?.page ?? null}
            highlightText={
              activeRetrievalResult?.highlightText ??
              activeRetrievalResult?.snippet ??
              query
            }
            invertColors={pdfInvertColors}
            key={activeFile.id}
            source={
              activeFile.storageUrl ||
              `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`
            }
          />
        </div>
      ) : isOfficePreview ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <OfficeViewer
            fileName={activeFile.name}
            key={`${activeFile.id}:${activeRetrievalChunkId ?? ""}`}
            kind={
              isSpreadsheet
                ? "spreadsheet"
                : isPresentation
                  ? "presentation"
                  : "document"
            }
            retrievalTarget={{
              page: activeRetrievalResult?.page ?? null,
              text:
                activeRetrievalResult?.highlightText ??
                activeRetrievalResult?.snippet ??
                query,
            }}
            source={
              activeFile.storageUrl ||
              `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`
            }
          />
        </div>
      ) : isVideo && !videoLoadFailed ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center p-0 sm:p-4">
            <FileMediaPlayer
              activeRangeIndex={
                activeFileRetrievalResults.findIndex(
                  (item) => item.chunkId === activeRetrievalChunkId
                ) >= 0
                  ? activeFileRetrievalResults.findIndex(
                      (item) => item.chunkId === activeRetrievalChunkId
                    )
                  : null
              }
              captionsSrc={activeVideoCaptionsSrc}
              kind="video"
              name={activeFile.name}
              onError={() => {
                setVideoLoadFailed(true);
              }}
              openedCached={shouldUsePreferredVideoSource}
              playbackSource={activeVideoPlaybackSource}
              posterUrl={activePlaybackDescriptor?.posterUrl}
              retrievalRanges={activeFileRetrievalResults
                .filter(
                  (item) =>
                    typeof item.startMs === "number" &&
                    Number.isFinite(item.startMs)
                )
                .map((item) => ({
                  startMs: item.startMs as number,
                  endMs: item.endMs,
                }))}
              seekToMs={activeRetrievalResult?.startMs ?? null}
            />
          </div>
        </div>
      ) : isAudio && !audioLoadFailed ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center p-0 sm:p-4">
            <FileMediaPlayer
              kind="audio"
              name={activeFile.name}
              onError={() => {
                setAudioLoadFailed(true);
              }}
              openedCached={
                isOpenedCached ||
                getWarmState(activeAudioPlaybackSource) === "warm"
              }
              playbackSource={activeAudioPlaybackSource}
            />
          </div>
        </div>
      ) : isImage ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1360px] flex-col gap-3 p-0 sm:p-4">
            <div className="w-full">
              <PanPinchImageViewer
                alt={activeFile.name}
                src={activeFileSourceUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-[55vh] flex-col items-center justify-center gap-3 rounded-none border-0 bg-card p-0 text-center sm:rounded-md sm:border sm:border-border/70 sm:p-4">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">
              In-app preview is unavailable for this file type.
            </p>
            <Button
              onClick={() =>
                window.open(
                  activeFile.storageUrl,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Open in new tab
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
