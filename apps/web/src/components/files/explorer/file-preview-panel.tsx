"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
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
import { FileMediaPlayer } from "@avenire/ui/media";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUp,
  Copy,
  ChevronDown,
  FileText,
  FileImage,
  FolderInput,
  Info,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  SlidersHorizontal,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import AvenireEditor from "@/components/editor";
import { PropertiesTable } from "@/components/editor/properties-table";
import type {
  FileRecord,
  FolderRecord,
  ShareSuggestion,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import {
  detectPreviewKind,
  toUpdatedLabel,
} from "@/components/files/explorer/shared";
import { ShareDialog } from "@/components/files/explorer/share-dialog";
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
import {
  buildProgressivePlaybackSource,
  buildVideoPlaybackDescriptor,
} from "@/lib/media-playback";
import { requestUploadPreflight } from "@/lib/upload-preflight";
import {
  readWorkspaceMarkdownCache,
  writeWorkspaceMarkdownCache,
} from "@/lib/workspace-markdown-cache";
import { useHeaderStore } from "@/stores/header-store";

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border/70 bg-card text-sm">
      Loading PDF...
    </div>
  ),
  ssr: false,
});

interface FilePreviewPanelProps {
  activeFile: FileRecord;
  activeRetrievalChunkId: string | null;
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  copyFileShareLink: (file: FileRecord) => void;
  currentFolderId: string;
  currentInfoEntries: { label: string; value: string }[];
  deleteSelectionItems: (items: { id: string; kind: "file" | "folder" }[]) => void;
  downloadFileDirect: (file: FileRecord) => void;
  downloadItemArchive: (item: {
    id: string;
    kind: "file" | "folder";
    name: string;
  }) => void;
  duplicateItem: (item: {
    id: string;
    kind: "file" | "folder";
    parentId?: string | null;
  }) => void;
  filePathById: Map<string, string>;
  hardReingestFile: (file: FileRecord) => Promise<void>;
  isCurrentPinned: boolean;
  loadShareSuggestions: (q: string, cb: (s: ShareSuggestion[]) => void) => void;
  moveFile: (fileId: string, targetFolderId: string) => Promise<void>;
  openFileById: (fileId: string) => void;
  openRenameFileDialog: (file: FileRecord) => void;
  query: string;
  retrievalResults: WorkspaceSearchResult[];
  selectFile: (fileId: string | null) => void;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
  startUpload: (files: File[], input?: unknown) => Promise<unknown>;
  toggleCurrentPinnedItem: () => void;
  wikiMarkdownFiles: Array<{
    id: string;
    title: string;
    excerpt: string;
    content: string;
  }>;
  workspaceMembers: WorkspaceMemberRecord[];
  propertyDefinitions: WorkspacePropertyDefinition[];
  setPropertyDefinitions: (definitions: WorkspacePropertyDefinition[]) => void;
  workspaceUuid: string;
}

export function FilePreviewPanel({
  activeFile,
  workspaceUuid,
  allFolders,
  query,
  retrievalResults,
  activeRetrievalChunkId,
  selectFile,
  openFileById,
  openRenameFileDialog,
  deleteSelectionItems,
  moveFile,
  duplicateItem,
  downloadFileDirect,
  copyFileShareLink,
  hardReingestFile,
  toggleCurrentPinnedItem,
  isCurrentPinned,
  currentInfoEntries,
  wikiMarkdownFiles,
  startBannerUpload,
  startUpload,
  loadShareSuggestions,
  propertyDefinitions,
  setPropertyDefinitions,
}: FilePreviewPanelProps) {
  const filePreviewScrollRef = useRef<HTMLDivElement | null>(null);
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [markdownOriginal, setMarkdownOriginal] = useState("");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [markdownSaving, setMarkdownSaving] = useState(false);
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
  const [noteRemoteUpdatedAt, setNoteRemoteUpdatedAt] = useState<string | null>(
    null
  );
  const [noteBannerUploadBusy, setNoteBannerUploadBusy] = useState(false);
  const [loadedMarkdownFileId, setLoadedMarkdownFileId] = useState<
    string | null
  >(null);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [mediaStreamFailed, setMediaStreamFailed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const noteBannerInputRef = useRef<HTMLInputElement | null>(null);
  const noteSyncDebounceRef = useRef<number | null>(null);
  const noteSyncInFlightRef = useRef(false);
  const noteSyncQueuedRef = useRef(false);

  const activeFileIsMarkdown = useMemo(
    () => detectPreviewKind(activeFile).isMarkdown,
    [activeFile]
  );
  const activeFileIsNote = Boolean(activeFile.isNote);
  const activeFileSourceUrl = activeFileIsNote
    ? `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`
    : activeFile.storageUrl;
  const activePageFromFile = useMemo(
    () => normalizePageMetadataState(activeFile.page),
    [
      activeFile.page?.bannerUrl ?? null,
      activeFile.page?.icon ?? null,
      JSON.stringify(activeFile.page?.properties ?? {}),
    ]
  );
  const activeFileUpdatedAt = activeFile.updatedAt ?? null;
  const activeFilePropertyCount = Object.keys(notePage.properties).length;
  const cachedMarkdown = useMemo(
    () =>
      workspaceUuid && activeFileIsMarkdown
        ? readWorkspaceMarkdownCache(workspaceUuid, activeFile.id)
        : null,
    [activeFile.id, activeFileIsMarkdown, workspaceUuid]
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
      setNoteRemoteUpdatedAt(activeFileUpdatedAt);
      return;
    }

    const cached =
      cachedMarkdown && cachedMarkdown.updatedAt === activeFileUpdatedAt
        ? cachedMarkdown
        : null;

    if (cached) {
      setMarkdownLoading(activeFileIsNote);
      setMarkdownError(null);
      setMarkdownOriginal(cached.body);
      setMarkdownDraft(activeFileIsNote ? cached.body : cached.content);
      setNoteBaseContent(cached.body);
      setNotePage(cached.page);
      setNotePageOriginal(cached.page);
      setNoteRemoteUpdatedAt(cached.updatedAt ?? activeFileUpdatedAt);
      setLoadedMarkdownFileId(activeFileIsNote ? null : activeFile.id);
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
      setNoteRemoteUpdatedAt(activeFileUpdatedAt);
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    activeFileIsNote,
    activePageFromFile,
    activeFileUpdatedAt,
    cachedMarkdown,
    loadedMarkdownFileId,
    workspaceUuid,
  ]);

  useEffect(() => {
    if (!(workspaceUuid && activeFileIsNote)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setMarkdownLoading(true);
    setMarkdownError(null);

    void fetch(`/api/notes/${activeFile.id}/sync`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load note (${response.status})`);
        }
        const payload = (await response.json().catch(() => ({}))) as {
          markdown?: string;
          updatedAt?: string | null;
          version?: number;
        };
        if (cancelled) {
          return;
        }
        const markdown = payload.markdown ?? "";
        setMarkdownOriginal(markdown);
        setMarkdownDraft(markdown);
        setNoteBaseContent(markdown);
        setNoteRemoteUpdatedAt(payload.updatedAt ?? null);
        setLoadedMarkdownFileId(activeFile.id);
        writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
          body: markdown,
          content: markdown,
          page: activePageFromFile,
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
    activeFileIsNote,
    workspaceUuid,
  ]);

  useEffect(() => {
    if (!(workspaceUuid && activeFileIsMarkdown)) {
      setMarkdownLoading(false);
      setMarkdownError(null);
      setMarkdownOriginal("");
      setMarkdownDraft("");
      setNoteBaseContent("");
      setNotePage(activePageFromFile);
      setNotePageOriginal(activePageFromFile);
      setNoteRemoteUpdatedAt(activeFileUpdatedAt);
      return;
    }

    if (activeFileIsNote) {
      return;
    }

    const cached =
      cachedMarkdown && cachedMarkdown.updatedAt === activeFileUpdatedAt
        ? cachedMarkdown
        : null;
    if (cached && loadedMarkdownFileId === activeFile.id) {
      setMarkdownLoading(false);
      setMarkdownError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setMarkdownLoading(true);
    setMarkdownError(null);

    fetch(`/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`, {
      signal: controller.signal,
      headers: {
        Accept: "text/markdown,text/plain,*/*",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load markdown (${response.status})`);
        }
        const text = await response.text();
        if (cancelled) {
          return;
        }
        setMarkdownOriginal(text);
        setMarkdownDraft(text);
        setNoteBaseContent(text);
        setNotePageOriginal(activePageFromFile);
        setNotePage(activePageFromFile);
        setNoteRemoteUpdatedAt(activeFileUpdatedAt);
        setLoadedMarkdownFileId(activeFile.id);
        writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
          body: text,
          content: text,
          page: activePageFromFile,
          updatedAt: activeFileUpdatedAt,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        if ((error as { name?: string })?.name === "AbortError") {
          return;
        }
        setMarkdownError(
          error instanceof Error ? error.message : "Unable to load markdown."
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setMarkdownLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    activeFileIsNote,
    activeFileUpdatedAt,
    activePageFromFile,
    cachedMarkdown,
    loadedMarkdownFileId,
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

  useEffect(() => {
    if (
      !activeFileIsNote ||
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
        const response = await fetch(`/api/notes/${activeFile.id}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base: latestNoteBaseContentRef.current,
            current: latestMarkdownBodyRef.current,
          }),
        });
        if (!response.ok) {
          throw new Error("Unable to sync note.");
        }

        const payload = (await response.json().catch(() => ({}))) as {
          hasConflict?: boolean;
          merged?: string;
          updatedAt?: string | null;
        };
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
    activeFileIsNote,
    loadedMarkdownFileId,
    markdownBody,
    markdownDirty,
    noteBaseContent,
    workspaceUuid,
  ]);

  const saveMarkdown = useCallback(async () => {
    if (!(workspaceUuid && activeFile && activeFileIsMarkdown)) {
      return;
    }
    if (activeFile.readOnly) {
      return;
    }
    if (!(markdownDirty || notePageDirty)) {
      return;
    }

    setMarkdownSaving(true);
    try {
      const blob = new Blob([markdownDraft], { type: "text/markdown" });
      const file = new File([blob], activeFile.name, { type: "text/markdown" });
      await requestUploadPreflight({
        file,
        folderId: activeFile.folderId,
        workspaceUuid,
      });
      const uploaded = ((await startUpload([file])) ?? [])[0] as
        | {
            key?: string;
            ufsUrl?: string;
            url?: string;
            size?: number;
            contentType?: string;
          }
        | undefined;
      const storageKey = uploaded?.key;
      const storageUrl = uploaded?.ufsUrl ?? uploaded?.url;
      if (!(storageKey && storageUrl)) {
        throw new Error("Upload returned no file metadata");
      }

      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/content`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: notePage,
            storageKey,
            storageUrl,
            sizeBytes: blob.size,
            mimeType: "text/markdown",
          }),
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Unable to save markdown.");
      }

      setMarkdownOriginal(markdownBody);
      setNotePageOriginal(notePage);
      writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
        body: markdownBody,
        content: markdownDraft,
        page: notePage,
        updatedAt: activeFileUpdatedAt,
      });
    } catch (error) {
      setMarkdownError(
        error instanceof Error ? error.message : "Unable to save markdown."
      );
    } finally {
      setMarkdownSaving(false);
    }
  }, [
    activeFile,
    activeFileIsMarkdown,
    markdownDirty,
    markdownBody,
    notePage,
    notePageDirty,
    startUpload,
    workspaceUuid,
  ]);

  const fileMetadataSaveTimerRef = useRef<number | null>(null);

  const saveFileMetadata = useCallback(async () => {
    if (activeFile.readOnly || !notePageDirty) {
      return;
    }

    const endpoint = activeFileIsNote
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
    activeFileIsNote,
    activeFileUpdatedAt,
    markdownBody,
    notePage,
    notePageDirty,
    workspaceUuid,
  ]);

  useEffect(() => {
    if (
      activeFile.readOnly ||
      (activeFileIsMarkdown && !activeFileIsNote)
    ) {
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
  }, [
    activeFile.readOnly,
    activeFileIsMarkdown,
    activeFileIsNote,
    notePageDirty,
    saveFileMetadata,
  ]);

  useEffect(() => {
    setNoteSaveState("idle");
    setNotePage(activePageFromFile);
    setNotePageOriginal(activePageFromFile);
    setNoteRemoteUpdatedAt(activeFileUpdatedAt);
  }, [activeFile.id]);

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

  const triggerNoteBannerPicker = useCallback(() => {
    if (!activeFileIsNote || activeFile.readOnly || noteBannerUploadBusy) {
      return;
    }
    noteBannerInputRef.current?.click();
  }, [activeFile.readOnly, activeFileIsNote, noteBannerUploadBusy]);

  const handleNoteBannerInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!(file && activeFileIsNote) || activeFile.readOnly) {
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

        setNotePage((current) => ({
          ...current,
          bannerUrl: uploadedUrl,
        }));
      } catch (error) {
        setMarkdownError(
          error instanceof Error ? error.message : "Unable to upload banner."
        );
      } finally {
        setNoteBannerUploadBusy(false);
      }
    },
    [activeFile.readOnly, activeFileIsNote, startBannerUpload]
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

  const { isAudio, isImage, isPdf, isVideo, isMarkdown } =
    detectPreviewKind(activeFile);
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

  const setHeaderContext = useHeaderStore(
    (state) => state.setHeaderContext
  );
  const resetHeaderContext = useHeaderStore(
    (state) => state.resetHeaderContext
  );
  useEffect(() => {
    setHeaderContext({
      title: activeFile.name,
      leadingIcon: (
        <div className="flex size-6 items-center justify-center text-muted-foreground">
          <FileText className="size-4" />
        </div>
      ),
      breadcrumbs: (
        <div className="min-w-0 flex-1">
          <span className="truncate font-medium text-foreground">
            {activeFile.name}
          </span>
        </div>
      ),
      actions: (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="hidden text-muted-foreground text-xs sm:inline">
            Edited {toUpdatedLabel(activeFile.updatedAt ?? activeFile.createdAt)}{" "}
            ago
          </span>
          {isMarkdown && !activeFile.readOnly && !activeFile.isNote ? (
            <Button
              className="h-7"
              disabled={markdownSaving}
              onClick={() => {
                void saveMarkdown();
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {markdownSaving ? "Saving..." : "Save"}
            </Button>
          ) : null}
          {activeFile.readOnly ? null : (
            <ShareDialog
              activeFile={activeFile}
              loadShareSuggestions={loadShareSuggestions}
              variant="file"
              workspaceUuid={workspaceUuid}
            />
          )}
          <Button
            className="size-5"
            onClick={toggleCurrentPinnedItem}
            size="icon-xs"
            type="button"
            variant={isCurrentPinned ? "secondary" : "ghost"}
          >
            {isCurrentPinned ? (
              <PinOff className="size-3" />
            ) : (
              <Pin className="size-3" />
            )}
          </Button>
          <Button
            className="size-5"
            onClick={() =>
              window.open(activeFileSourceUrl, "_blank", "noopener,noreferrer")
            }
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <ArrowUp className="size-3" />
          </Button>
          <Popover open={propertiesOpen} onOpenChange={setPropertiesOpen}>
            <PopoverTrigger
              render={
                <Button
                  className="h-7 gap-1.5 px-2"
                  size="sm"
                  type="button"
                  variant="secondary"
                />
              }
            >
              <SlidersHorizontal className="size-3" />
              <span>Properties</span>
              {activeFilePropertyCount > 0 ? (
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {activeFilePropertyCount}
                </span>
              ) : null}
              <ChevronDown className="size-3 opacity-60" />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[28rem] max-w-[calc(100vw-1rem)] overflow-hidden p-0"
            >
              <div className="border-border/60 border-b px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Properties
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit the file's frontmatter directly from the header.
                </p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                {activeFileIsNote ? (
                  <div className="mb-4 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Banner
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Add or replace the page banner for this note.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          className="h-7 px-2"
                          disabled={activeFile.readOnly || noteBannerUploadBusy}
                          onClick={triggerNoteBannerPicker}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <FileImage className="mr-1 size-3.5" />
                          {noteBannerUploadBusy ? "Uploading..." : "Change"}
                        </Button>
                        <Button
                          className="h-7 px-2"
                          disabled={
                            activeFile.readOnly ||
                            noteBannerUploadBusy ||
                            !noteBannerUrl
                          }
                          onClick={() => {
                            setNotePage((current) => ({
                              ...current,
                              bannerUrl: null,
                            }));
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                      {noteBannerUrl ? (
                        <img
                          alt={`${activeFile.name} banner`}
                          className="h-28 w-full object-cover"
                          height={280}
                          loading="lazy"
                          src={noteBannerUrl}
                          width={1200}
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center bg-[#d8d1c5] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          No banner set
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                <PropertiesTable
                  className="mx-0 mb-0 max-w-none border-0 px-0 pb-0 pt-0 sm:px-0"
                  definitions={propertyDefinitions}
                  disabled={activeFile.readOnly}
                  onDefinitionsChange={setPropertyDefinitions}
                  onChange={(properties) => {
                    setNotePage((current) => ({
                      ...current,
                      properties,
                    }));
                  }}
                  properties={notePage.properties}
                />
                {activeFileIsNote ? (
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handleNoteBannerInputChange}
                    ref={noteBannerInputRef}
                    type="file"
                  />
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  className="size-5"
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <MoreHorizontal className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={toggleCurrentPinnedItem}>
                {isCurrentPinned ? (
                  <PinOff className="size-3.5" />
                ) : (
                  <Pin className="size-3.5" />
                )}
                {isCurrentPinned ? "Unpin" : "Pin"}
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
                  void duplicateItem({
                    id: activeFile.id,
                    kind: "file",
                    parentId: activeFile.folderId,
                  });
                }}
              >
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void copyFileShareLink(activeFile);
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
                <DropdownMenuSubContent>
                  {allFolders
                    .filter((folder) => !folder.readOnly)
                    .slice(0, 20)
                    .map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => {
                          void moveFile(activeFile.id, folder.id);
                        }}
                      >
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => {
                  downloadFileDirect(activeFile);
                }}
              >
                <ArrowDownToLine className="size-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void hardReingestFile(activeFile);
                }}
              >
                <RotateCcw className="size-3.5" />
                Hard Re-ingest
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Info className="size-3.5" />
                  Metadata
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72">
                  <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                  void deleteSelectionItems([
                    { id: activeFile.id, kind: "file" },
                  ]);
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
    activeFile.name,
    activeFile.readOnly,
    activeFileIsNote,
    allFolders,
    activeFilePropertyCount,
    currentInfoEntries,
    copyFileShareLink,
    deleteSelectionItems,
    downloadFileDirect,
    isCurrentPinned,
    isMarkdown,
    loadShareSuggestions,
    noteBannerUploadBusy,
    noteBannerUrl,
    notePage,
    propertiesOpen,
    propertyDefinitions,
    markdownSaving,
    handleNoteBannerInputChange,
    moveFile,
    openRenameFileDialog,
    resetHeaderContext,
    saveMarkdown,
    setPropertyDefinitions,
    setHeaderContext,
    triggerNoteBannerPicker,
    toggleCurrentPinnedItem,
    workspaceUuid,
  ]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {isMarkdown ? (
        <div
          className="min-h-0 flex-1 overflow-auto bg-muted/25"
          ref={filePreviewScrollRef}
        >
          <div className="h-full">
            {markdownError ? (
              <div className="mx-auto flex h-[70vh] max-w-[820px] flex-col items-center justify-center gap-3 p-0 text-center sm:p-4">
                <FileText className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">{markdownError}</p>
              </div>
            ) : markdownLoading || !isMarkdownReady ? (
              <div className="mx-auto flex h-[70vh] max-w-[820px] items-center justify-center p-0 text-muted-foreground text-sm sm:p-4">
                Loading markdown...
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {activeFileIsNote ? (
                  <div className="border-border/50 border-b bg-background">
                    <div className="group relative w-full overflow-hidden border-b border-border/60 bg-muted/30">
                      {noteBannerUrl ? (
                        <img
                          alt={`${activeFile.name} banner`}
                          className="h-52 w-full object-cover"
                          loading="lazy"
                          src={noteBannerUrl}
                        />
                      ) : (
                        <div className="h-52 w-full bg-[#d8d1c5]" />
                      )}
                      <div className="absolute inset-0 bg-black/5" />
                    </div>
                  </div>
                ) : null}
                <AvenireEditor
                  defaultValue={markdownBody}
                  key={activeFile.id}
                  onChange={handleMarkdownBodyChange}
                  onOpenWikiLink={(page) => {
                    openFileById(page.id);
                  }}
                  saveState={activeFile.isNote ? noteSaveState : undefined}
                  scrollContainerRef={filePreviewScrollRef}
                  workspaceUuid={workspaceUuid}
                  wikiPages={wikiMarkdownFiles}
                />
              </div>
            )}
          </div>
        </div>
      ) : isPdf ? (
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/25">
          <PDFViewer
            className="h-full min-h-0 rounded-none border-0 sm:rounded-xl sm:border sm:border-border/70"
            key={`${activeFile.id}:${activeRetrievalChunkId ?? activeRetrievalResult?.page ?? "base"}`}
            fallbackHighlightText={query}
            highlightPage={activeRetrievalResult?.page ?? null}
            highlightText={
              activeRetrievalResult?.highlightText ??
              activeRetrievalResult?.snippet ??
              query
            }
            source={activeFile.storageUrl}
          />
        </div>
      ) : isVideo && !videoLoadFailed ? (
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/25">
          <div className="mx-auto flex h-full min-h-0 max-w-[1200px] items-center justify-center p-0 sm:p-4">
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
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/25">
          <div className="mx-auto flex h-full min-h-0 max-w-[900px] items-center justify-center p-0 sm:p-4">
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
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/25">
          <div className="mx-auto flex h-full min-h-0 max-w-[1200px] flex-col gap-3 p-0 sm:p-4">
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-none border-0 bg-white p-0 sm:rounded-2xl sm:border sm:border-border/70 sm:p-4">
              <img
                alt={activeFile.name}
                className="h-auto max-h-full max-w-full rounded-md object-contain"
                src={activeFile.storageUrl}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/25">
          <div className="flex h-full min-h-[55vh] flex-col items-center justify-center gap-3 rounded-none border-0 bg-card p-0 text-center sm:rounded-md sm:border sm:border-border/70 sm:p-4">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">
              In-app preview is unavailable for this file type.
            </p>
            <Button
              onClick={() =>
                window.open(activeFile.storageUrl, "_blank", "noopener,noreferrer")
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
