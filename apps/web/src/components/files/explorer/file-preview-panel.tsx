"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import {
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
} from "@/lib/file-preview-cache";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { buildProgressivePlaybackSource } from "@/lib/media-playback";
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
import { buildFilePreviewPanelDerivedState } from "./file-preview-panel-model";
import { FilePreviewPropertiesDialog } from "./file-preview-properties-dialog";
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
  useEffect(() => {
    setCircleToAiEnabled(false);
  }, []);
  const derivedState = useMemo(
    () =>
      buildFilePreviewPanelDerivedState({
        activeFile,
        activeFileIsMarkdown,
        activeRetrievalChunkId,
        mediaStreamFailed,
        query,
        retrievalResults,
        workspaceUuid,
      }),
    [
      activeFile,
      activeFileIsMarkdown,
      activeRetrievalChunkId,
      mediaStreamFailed,
      query,
      retrievalResults,
      workspaceUuid,
    ]
  );
  const { isAudio, isImage, isPdf, isVideo, isMarkdown } = derivedState;

  useEffect(() => {
    setVideoLoadFailed(false);
    setAudioLoadFailed(false);
    setMediaStreamFailed(false);
    setPdfInvertColors(true);
  }, []);

  useEffect(() => {
    markFileOpened(activeFile.id);
    if (!(isAudio || isVideo)) {
      return;
    }

    const playbackSource = isVideo
      ? (derivedState.activePlaybackDescriptor?.preferredSource ?? null)
      : derivedState.activeMediaStreamUrl
        ? buildProgressivePlaybackSource(
            derivedState.activeMediaStreamUrl,
            activeFile.mimeType
          )
        : null;
    if (!playbackSource) {
      return;
    }

    void primeMediaPlayback(playbackSource, {
      mediaType: isVideo ? "video" : "audio",
      posterUrl: isVideo
        ? derivedState.activePlaybackDescriptor?.posterUrl
        : null,
      sizeBytes: activeFile.sizeBytes,
      surface: "viewer",
    });
    return () => {
      releaseMediaPlaybackPrime(playbackSource);
    };
  }, [
    activeFile,
    activeFile.mimeType,
    derivedState.activeMediaStreamUrl,
    derivedState.activePlaybackDescriptor,
    isAudio,
    isVideo,
  ]);

  const isOpenedCached = isFileOpenedCached(activeFile.id);
  const activeAudioPlaybackSource = buildProgressivePlaybackSource(
    derivedState.activeMediaStreamUrl ?? activeFile.storageUrl,
    activeFile.mimeType
  );
  const isPreferredVideoSourceWarm = derivedState.activePlaybackDescriptor
    ? getWarmState(derivedState.activePlaybackDescriptor.preferredSource) ===
      "warm"
    : false;
  const shouldUsePreferredVideoSource =
    isOpenedCached || isPreferredVideoSourceWarm;
  const activeVideoPlaybackSource = derivedState.activePlaybackDescriptor
    ? derivedState.activePlaybackDescriptor.preferredSource
    : buildProgressivePlaybackSource(
        derivedState.activeMediaStreamUrl ?? activeFile.storageUrl,
        activeFile.mimeType
      );
  const mediaModel = useMemo(
    () =>
      buildFilePreviewMediaModel({
        activeAudioPlaybackSource,
        activeFile,
        activeFileSourceUrl: derivedState.activeFileSourceUrl,
        activeVideoCaptionsSrc: derivedState.activeVideoCaptionsSrc,
        activeVideoPlaybackSource,
        audioOpenedCached:
          isOpenedCached || getWarmState(activeAudioPlaybackSource) === "warm",
        isAudio,
        isAudioLoadFailed: audioLoadFailed,
        isImage,
        isPdf,
        isVideo,
        posterUrl: derivedState.activePlaybackDescriptor?.posterUrl ?? null,
        retrievalModel: derivedState.retrievalModel,
        shouldUsePreferredVideoSource,
        videoLoadFailed,
      }),
    [
      activeAudioPlaybackSource,
      activeFile,
      activeVideoPlaybackSource,
      audioLoadFailed,
      derivedState.activeFileSourceUrl,
      derivedState.activePlaybackDescriptor?.posterUrl,
      derivedState.activeVideoCaptionsSrc,
      derivedState.retrievalModel,
      isAudio,
      isImage,
      isOpenedCached,
      isPdf,
      isVideo,
      shouldUsePreferredVideoSource,
      videoLoadFailed,
    ]
  );

  useFilePreviewPaneHeader({
    activeCustomIcon: derivedState.activeCustomIcon,
    activeFile,
    activeFileIsMarkdown,
    activeFileSourceUrl: derivedState.activeFileSourceUrl,
    activeLinkSourceUrl: derivedState.activeLinkSourceUrl,
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
