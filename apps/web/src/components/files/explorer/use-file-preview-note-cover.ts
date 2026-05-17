"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_NOTE_COVER_URL,
  type MarkdownCoverTab,
} from "@/components/files/explorer/file-preview-note-shared";

interface UseFilePreviewNoteCoverOptions {
  activeFileIsMarkdown: boolean;
  bannerUrl: string | null | undefined;
  onBannerUrlChange: (url: string | null) => void;
  onUploadError: (message: string) => void;
  readOnly: boolean;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
}

export function useFilePreviewNoteCover({
  activeFileIsMarkdown,
  bannerUrl,
  onBannerUrlChange,
  onUploadError,
  readOnly,
  startBannerUpload,
}: UseFilePreviewNoteCoverOptions) {
  const [noteBannerUploadBusy, setNoteBannerUploadBusy] = useState(false);
  const [noteCoverPickerTab, setNoteCoverPickerTab] =
    useState<MarkdownCoverTab>("gallery");
  const [noteCoverLinkDraft, setNoteCoverLinkDraft] = useState("");
  const noteBannerInputRef = useRef<HTMLInputElement | null>(null);

  const noteBannerUrl = useMemo(() => {
    const trimmed = bannerUrl?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }, [bannerUrl]);

  useEffect(() => {
    setNoteCoverLinkDraft(noteBannerUrl ?? "");
  }, [noteBannerUrl]);

  const setNoteCoverUrl = useCallback(
    (url: string | null) => {
      setNoteCoverLinkDraft(url ?? "");
      onBannerUrlChange(url);
    },
    [onBannerUrlChange]
  );

  const applyDefaultNoteCover = useCallback(() => {
    if (!activeFileIsMarkdown || readOnly) {
      return;
    }

    setNoteCoverUrl(DEFAULT_NOTE_COVER_URL);
  }, [activeFileIsMarkdown, readOnly, setNoteCoverUrl]);

  const triggerNoteBannerPicker = useCallback(() => {
    if (!activeFileIsMarkdown || readOnly || noteBannerUploadBusy) {
      return;
    }

    noteBannerInputRef.current?.click();
  }, [activeFileIsMarkdown, noteBannerUploadBusy, readOnly]);

  const handleNoteBannerInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";

      if (!(file && activeFileIsMarkdown) || readOnly) {
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
        onUploadError(
          error instanceof Error ? error.message : "Unable to upload banner."
        );
      } finally {
        setNoteBannerUploadBusy(false);
      }
    },
    [
      activeFileIsMarkdown,
      onUploadError,
      readOnly,
      setNoteCoverUrl,
      startBannerUpload,
    ]
  );

  return {
    applyDefaultNoteCover,
    handleNoteBannerInputChange,
    noteBannerInputRef,
    noteBannerUploadBusy,
    noteBannerUrl,
    noteCoverLinkDraft,
    noteCoverPickerTab,
    setNoteCoverLinkDraft,
    setNoteCoverPickerTab,
    setNoteCoverUrl,
    triggerNoteBannerPicker,
  };
}
