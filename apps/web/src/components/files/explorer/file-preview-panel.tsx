"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { detectPreviewKind } from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import {
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
} from "@/lib/file-preview-cache";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import {
  buildProgressivePlaybackSource,
  buildVideoPlaybackDescriptor,
} from "@/lib/media-playback";
import {
  useCurrentWorkspacePane,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { useUserStore } from "@/stores/userStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";
import type { ExplorerSurfaceInfoEntry } from "./explorer-surface-summary-model";
import { FilePreviewMarkdownPane } from "./file-preview-markdown-pane";
import { buildFilePreviewMediaModel } from "./file-preview-media-model";
import { FilePreviewMediaPane } from "./file-preview-media-pane";
import { FilePreviewPropertiesDialog } from "./file-preview-properties-dialog";
import { buildFilePreviewRetrievalModel } from "./file-preview-retrieval-model";
import { useFilePreviewNoteWorkflows } from "./use-file-preview-note-workflows";
import { useFilePreviewPaneHeader } from "./use-file-preview-pane-header";

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

export interface FilePreviewPanelProps {
  activeFile: FileRecord;
  activeRetrievalChunkId: string | null;
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
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
  setPropertyDefinitions: (definitions: WorkspacePropertyDefinition[]) => void;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
  toggleCurrentPinnedItem: () => void;
  wikiLinkableFiles: Array<{
    id: string;
    title: string;
    excerpt: string;
    content: string;
  }>;
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
  const [pdfInvertColors, setPdfInvertColors] = useState(true);
  const [circleToAiEnabled, setCircleToAiEnabled] = useState(false);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [mediaStreamFailed, setMediaStreamFailed] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const searchParams = usePaneSearchParams();
  const { isActive: isPaneActive, paneId } = useCurrentWorkspacePane();
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const paneCount = useWorkspacePaneStore((state) => state.panes.length);
  const currentUser = useUserStore((state) => state.user);
  const circleToAiParam = searchParams.get("circleToAi");
  const canClosePane = paneCount > 1;

  const {
    activeFileIsMarkdown,
    applyDefaultNoteCover,
    handleMarkdownBodyChange,
    handleNoteBannerInputChange,
    isMarkdownReady,
    markdownBody,
    markdownDisplayTitle,
    markdownError,
    markdownLoading,
    noteBannerInputRef,
    noteBannerUploadBusy,
    noteBannerUrl,
    noteCoverLinkDraft,
    noteCoverPickerTab,
    noteDisplayTitle,
    notePage,
    noteSaveState,
    setNoteCoverLinkDraft,
    setNoteCoverPickerTab,
    setNoteCoverUrl,
    setNotePage,
    triggerNoteBannerPicker,
  } = useFilePreviewNoteWorkflows({
    activeFile,
    startBannerUpload,
    workspaceUuid,
  });

  useEffect(() => {
    setPropertiesOpen(false);
  }, []);

  const activeCustomIcon = normalizeFilePageIcon(activeFile.page?.icon);
  const activeLinkSourceUrl =
    activeFile.metadata &&
    typeof activeFile.metadata === "object" &&
    !Array.isArray(activeFile.metadata) &&
    activeFile.metadata.link &&
    typeof activeFile.metadata.link === "object" &&
    !Array.isArray(activeFile.metadata.link) &&
    typeof (activeFile.metadata.link as Record<string, unknown>).sourceUrl ===
      "string"
      ? ((activeFile.metadata.link as Record<string, unknown>)
          .sourceUrl as string)
      : null;
  const activeFileSourceUrl = activeFileIsMarkdown
    ? (activeLinkSourceUrl ??
      `/api/workspaces/${workspaceUuid}/files/${activeFile.id}/stream`)
    : activeFile.storageUrl;
  useEffect(() => {
    setCircleToAiEnabled(false);
  }, []);

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

  const retrievalModel = useMemo(
    () =>
      buildFilePreviewRetrievalModel({
        activeFileId: activeFile.id,
        activeRetrievalChunkId,
        query,
        retrievalResults,
      }),
    [activeFile.id, activeRetrievalChunkId, query, retrievalResults]
  );

  useEffect(() => {
    setVideoLoadFailed(false);
    setAudioLoadFailed(false);
    setMediaStreamFailed(false);
    setPdfInvertColors(true);
  }, []);

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
  const mediaModel = useMemo(
    () =>
      buildFilePreviewMediaModel({
        activeAudioPlaybackSource,
        activeFile,
        activeFileSourceUrl,
        activeVideoCaptionsSrc,
        activeVideoPlaybackSource,
        audioOpenedCached:
          isOpenedCached || getWarmState(activeAudioPlaybackSource) === "warm",
        isAudio,
        isAudioLoadFailed: audioLoadFailed,
        isImage,
        isPdf,
        isVideo,
        posterUrl: activePlaybackDescriptor?.posterUrl ?? null,
        retrievalModel,
        shouldUsePreferredVideoSource,
        videoLoadFailed,
      }),
    [
      activeAudioPlaybackSource,
      activeFile,
      activeFileSourceUrl,
      activePlaybackDescriptor?.posterUrl,
      activeVideoCaptionsSrc,
      activeVideoPlaybackSource,
      audioLoadFailed,
      isAudio,
      isImage,
      isOpenedCached,
      isPdf,
      isVideo,
      retrievalModel,
      shouldUsePreferredVideoSource,
      videoLoadFailed,
    ]
  );

  useFilePreviewPaneHeader({
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
    openPropertiesDialog: () => setPropertiesOpen(true),
    openFileShareDialog,
    openPane,
    openRenameFileDialog,
    paneId,
    pdfInvertColors,
    setCircleToAiEnabled,
    setPdfInvertColors,
    toggleCurrentPinnedItem,
  });

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <FilePreviewPropertiesDialog
        activeFileIsMarkdown={activeFileIsMarkdown}
        definitions={propertyDefinitions}
        noteBannerInputRef={noteBannerInputRef}
        onBannerInputChange={handleNoteBannerInputChange}
        onDefinitionsChange={setPropertyDefinitions}
        onOpenChange={setPropertiesOpen}
        onPropertiesChange={(properties) => {
          setNotePage((current) => ({
            ...current,
            properties,
          }));
        }}
        open={propertiesOpen}
        properties={notePage.properties}
        readOnly={Boolean(activeFile.readOnly)}
      />
      {isMarkdown ? (
        <FilePreviewMarkdownPane
          activeFileId={activeFile.id}
          activeFileIsMarkdown={activeFileIsMarkdown}
          activeFileName={activeFile.name}
          editorCreatedBy={
            currentUser?.name?.trim() || currentUser?.email?.trim() || ""
          }
          isMarkdownReady={isMarkdownReady}
          isPaneActive={isPaneActive}
          markdownBody={markdownBody}
          markdownError={markdownError}
          markdownLoading={markdownLoading}
          noteBannerUploadBusy={noteBannerUploadBusy}
          noteBannerUrl={noteBannerUrl}
          noteCoverLinkDraft={noteCoverLinkDraft}
          noteCoverPickerTab={noteCoverPickerTab}
          noteDisplayTitle={noteDisplayTitle}
          noteSaveState={activeFileIsMarkdown ? noteSaveState : undefined}
          onApplyDefaultNoteCover={applyDefaultNoteCover}
          onMarkdownBodyChange={handleMarkdownBodyChange}
          onNoteCoverLinkDraftChange={setNoteCoverLinkDraft}
          onNoteCoverPickerTabChange={setNoteCoverPickerTab}
          onOpenWikiLink={(page, options) => {
            if (!options.openInNewPane) {
              openFileById(page.id);
              return;
            }

            const targetFile = allFiles.find((file) => file.id === page.id);
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
          onSetNoteCoverUrl={setNoteCoverUrl}
          onTemplateApplied={(template) => {
            setNoteCoverUrl(template.bannerUrl);
          }}
          onTriggerNoteBannerPicker={triggerNoteBannerPicker}
          scrollContainerRef={filePreviewScrollRef}
          wikiPages={wikiLinkableFiles}
          workspaceUuid={workspaceUuid}
        />
      ) : (
        <FilePreviewMediaPane
          circleToAiEnabled={circleToAiEnabled}
          fallbackHighlightText={query}
          fileName={activeFile.name}
          model={mediaModel}
          onAudioError={() => {
            setAudioLoadFailed(true);
          }}
          onCircleToAiEnabledChange={setCircleToAiEnabled}
          onVideoError={() => {
            setVideoLoadFailed(true);
          }}
          pdfInvertColors={pdfInvertColors}
          workspaceUuid={workspaceUuid}
        />
      )}
    </div>
  );
}
