"use client";

import { useCallback, useMemo, useState } from "react";
import type { FileRecord } from "@/components/files/explorer/shared";
import {
  detectPreviewKind,
  getInlineMarkdownSeed,
} from "@/components/files/explorer/shared";
import { useFilePreviewNoteBootstrap } from "@/components/files/explorer/use-file-preview-note-bootstrap";
import { useFilePreviewNoteCover } from "@/components/files/explorer/use-file-preview-note-cover";
import { useFilePreviewNotePersistence } from "@/components/files/explorer/use-file-preview-note-persistence";
import {
  EMPTY_PAGE_METADATA_STATE,
  normalizePageMetadataState,
  type PageMetadataState,
} from "@/lib/frontmatter";
import { getMarkdownDisplayTitle } from "@/lib/markdown-title";
import { readWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";

interface UseFilePreviewNoteWorkflowsOptions {
  activeFile: FileRecord;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
  workspaceUuid: string;
}

export function useFilePreviewNoteWorkflows({
  activeFile,
  startBannerUpload,
  workspaceUuid,
}: UseFilePreviewNoteWorkflowsOptions) {
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [markdownOriginal, setMarkdownOriginal] = useState("");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [noteBaseContent, setNoteBaseContent] = useState("");
  const [notePage, setNotePage] = useState<PageMetadataState>(
    EMPTY_PAGE_METADATA_STATE
  );
  const [notePageOriginal, setNotePageOriginal] = useState<PageMetadataState>(
    EMPTY_PAGE_METADATA_STATE
  );
  const [loadedMarkdownFileId, setLoadedMarkdownFileId] = useState<
    string | null
  >(null);

  const activeFileIsMarkdown = detectPreviewKind(activeFile).isMarkdown;
  const activePageFromFile = useMemo(
    () => normalizePageMetadataState(activeFile.page),
    [activeFile.page]
  );
  const activeFileUpdatedAt = activeFile.updatedAt ?? null;
  const inlineMarkdownSeed = useMemo(
    () => getInlineMarkdownSeed(activeFile),
    [activeFile]
  );
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

  useFilePreviewNoteBootstrap({
    activeFile,
    activeFileIsMarkdown,
    activeFileUpdatedAt,
    activePageFromFile,
    inlineMarkdownSeed,
    loadedMarkdownFileId,
    matchingCachedMarkdown,
    setLoadedMarkdownFileId,
    setMarkdownDraft,
    setMarkdownError,
    setMarkdownLoading,
    setMarkdownOriginal,
    setNoteBaseContent,
    setNotePage,
    setNotePageOriginal,
    workspaceUuid,
  });

  const markdownBody = markdownDraft;
  const isMarkdownReady = loadedMarkdownFileId === activeFile.id;

  const handleMarkdownBodyChange = useCallback((nextBody: string) => {
    setMarkdownDraft(nextBody);
  }, []);

  const { noteSaveState } = useFilePreviewNotePersistence({
    activeFile,
    activeFileIsMarkdown,
    activeFileUpdatedAt,
    loadedMarkdownFileId,
    markdownBody,
    markdownOriginal,
    noteBaseContent,
    notePage,
    notePageOriginal,
    setLoadedMarkdownFileId,
    setMarkdownDraft,
    setMarkdownOriginal,
    setNoteBaseContent,
    setNotePageOriginal,
    workspaceUuid,
  });

  const {
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
  } = useFilePreviewNoteCover({
    activeFileIsMarkdown,
    bannerUrl: notePage.bannerUrl,
    onBannerUrlChange: (url) => {
      setNotePage((current) => ({
        ...current,
        bannerUrl: url,
      }));
    },
    onUploadError: (message) => {
      setMarkdownError(message);
    },
    readOnly: Boolean(activeFile.readOnly),
    startBannerUpload,
  });

  return {
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
  };
}
