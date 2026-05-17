"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getWarmState,
  isFileOpenedCached,
  markFileOpened,
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
} from "@/lib/file-preview-cache";
import { buildProgressivePlaybackSource } from "@/lib/media-playback";
import {
  useCurrentWorkspacePane,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { useUserStore } from "@/stores/userStore";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";
import { buildFilePreviewMediaModel } from "./file-preview-media-model";
import { buildFilePreviewPanelDerivedState } from "./file-preview-panel-model";
import type { FilePreviewPanelProps } from "./file-preview-panel-types";
import { useFilePreviewNoteWorkflows } from "./use-file-preview-note-workflows";
import { useFilePreviewPaneHeader } from "./use-file-preview-pane-header";

export function useFilePreviewPanel({
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
  const previewUser = currentUser
    ? {
        email: currentUser.email ?? null,
        name: currentUser.name ?? null,
      }
    : null;
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
    isImage: derivedState.isImage,
    isPdf: derivedState.isPdf,
    isVideo: derivedState.isVideo,
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

  return {
    activeFile,
    activeFileIsMarkdown,
    allFiles,
    applyDefaultNoteCover,
    audioLoadFailed,
    circleToAiEnabled,
    currentUser: previewUser,
    derivedState,
    filePreviewScrollRef,
    handleMarkdownBodyChange,
    handleNoteBannerInputChange,
    isMarkdownReady,
    isPaneActive,
    markdownBody,
    markdownError,
    markdownLoading,
    mediaModel,
    noteBannerInputRef,
    noteBannerUploadBusy,
    noteBannerUrl,
    noteCoverLinkDraft,
    noteCoverPickerTab,
    noteDisplayTitle,
    notePage,
    noteSaveState,
    openFileById,
    openPane,
    paneId,
    pdfInvertColors,
    propertiesOpen,
    propertyDefinitions,
    query,
    setAudioLoadFailed,
    setCircleToAiEnabled,
    setNoteCoverLinkDraft,
    setNoteCoverPickerTab,
    setNoteCoverUrl,
    setNotePage,
    setPdfInvertColors,
    setPropertiesOpen,
    setPropertyDefinitions,
    setVideoLoadFailed,
    startBannerUpload,
    triggerNoteBannerPicker,
    videoLoadFailed,
    wikiLinkableFiles,
    workspaceUuid,
  };
}

export type FilePreviewPanelRuntime = ReturnType<typeof useFilePreviewPanel>;
