"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Attachment } from "@/components/chat/attachment";
import {
  fetchPreviewAttachmentPlaybackDescriptor,
  loadPreviewAttachmentText,
} from "@/components/chat/preview-attachment-data";
import {
  buildPreviewAttachmentCapabilities,
  formatPreviewAttachmentFileSize,
  type PreviewAttachmentCapabilities,
} from "@/components/chat/preview-attachment-model";
import {
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
} from "@/lib/file-preview-cache";
import type { MediaPlaybackDescriptor } from "@/lib/media-playback";

export interface PreviewAttachmentRuntime {
  capabilities: PreviewAttachmentCapabilities;
  fileSize: string;
  handleBlur: () => void;
  handleFocus: () => void;
  handleHoverEnd: () => void;
  handleHoverStart: () => void;
  handleModalOpenChange: (nextOpen: boolean) => void;
  isHovered: boolean;
  isLoadingText: boolean;
  isModalOpen: boolean;
  openPreview: () => void;
  playbackDescriptor: MediaPlaybackDescriptor | null;
  previewUrl: string | null | undefined;
  textPreview: string | null;
}

export function usePreviewAttachment({
  attachment,
  workspaceUuid,
}: {
  attachment: Partial<Attachment>;
  workspaceUuid?: string;
}): PreviewAttachmentRuntime {
  const {
    contentType,
    file,
    name,
    sizeBytes,
    source,
    status,
    url,
    workspaceFileId,
  } = attachment;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [playbackDescriptor, setPlaybackDescriptor] =
    useState<MediaPlaybackDescriptor | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  const previewUrl =
    source === "workspace" && workspaceUuid && workspaceFileId
      ? `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/stream`
      : url;

  const fileSize = useMemo(
    () => formatPreviewAttachmentFileSize(file?.size ?? sizeBytes),
    [file?.size, sizeBytes]
  );

  const capabilities = useMemo(
    () =>
      buildPreviewAttachmentCapabilities({
        contentType,
        file,
        name,
        previewUrl,
        source,
        status,
      }),
    [contentType, file, name, previewUrl, source, status]
  );

  useEffect(() => {
    let cancelled = false;

    fetchPreviewAttachmentPlaybackDescriptor({
      contentType,
      url,
      workspaceFileId,
      workspaceUuid,
    }).then((descriptor) => {
      if (!cancelled) {
        setPlaybackDescriptor(descriptor);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contentType, url, workspaceFileId, workspaceUuid]);

  useEffect(() => {
    if (
      !(
        contentType?.startsWith("video") &&
        playbackDescriptor &&
        (isHovered || isModalOpen)
      )
    ) {
      return;
    }

    primeMediaPlayback(playbackDescriptor.preferredSource, {
      mediaType: "video",
      posterUrl: playbackDescriptor.posterUrl,
      sizeBytes,
      surface: "attachment",
    }).catch(() => undefined);

    return () => {
      releaseMediaPlaybackPrime(playbackDescriptor.preferredSource);
    };
  }, [contentType, isHovered, isModalOpen, playbackDescriptor, sizeBytes]);

  const loadText = useCallback(async () => {
    if (
      !(capabilities.isCodePreview && capabilities.canPreview) ||
      textPreview ||
      isLoadingText
    ) {
      return;
    }

    setIsLoadingText(true);
    try {
      setTextPreview(
        await loadPreviewAttachmentText({
          file,
          previewUrl,
          source,
          workspaceFileId,
          workspaceUuid,
        })
      );
    } catch {
      toast.error("Failed to load code preview");
    } finally {
      setIsLoadingText(false);
    }
  }, [
    capabilities.canPreview,
    capabilities.isCodePreview,
    file,
    isLoadingText,
    previewUrl,
    source,
    textPreview,
    workspaceFileId,
    workspaceUuid,
  ]);

  const openPreview = useCallback(() => {
    setIsModalOpen(true);
    if (capabilities.canPreview) {
      loadText().catch(() => undefined);
    }
  }, [capabilities.canPreview, loadText]);

  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
    loadText().catch(() => undefined);
  }, [loadText]);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleModalOpenChange = useCallback((nextOpen: boolean) => {
    setIsModalOpen(nextOpen);
    if (!nextOpen) {
      setIsHovered(false);
    }
  }, []);

  return {
    capabilities,
    fileSize,
    handleBlur,
    handleFocus,
    handleHoverEnd,
    handleHoverStart,
    handleModalOpenChange,
    isHovered,
    isLoadingText,
    isModalOpen,
    openPreview,
    playbackDescriptor,
    previewUrl,
    textPreview,
  };
}
