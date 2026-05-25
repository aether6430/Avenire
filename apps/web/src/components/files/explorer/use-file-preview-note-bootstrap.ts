"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { loadFilePreviewMarkdownNote } from "@/components/files/explorer/file-preview-note-client";
import type { FileRecord } from "@/components/files/explorer/shared";
import {
  normalizePageMetadataState,
  type PageMetadataState,
} from "@/lib/frontmatter";
import {
  type readWorkspaceMarkdownCache,
  writeWorkspaceMarkdownCache,
} from "@/lib/workspace-markdown-cache";

interface UseFilePreviewNoteBootstrapOptions {
  activeFile: FileRecord;
  activeFileIsMarkdown: boolean;
  activeFileUpdatedAt: string | null;
  activePageFromFile: PageMetadataState;
  inlineMarkdownSeed: string | null;
  loadedMarkdownFileId: string | null;
  matchingCachedMarkdown: ReturnType<typeof readWorkspaceMarkdownCache>;
  setLoadedMarkdownFileId: (fileId: string | null) => void;
  setMarkdownDraft: (markdown: string) => void;
  setMarkdownError: (error: string | null) => void;
  setMarkdownLoading: (loading: boolean) => void;
  setMarkdownOriginal: (markdown: string) => void;
  setNoteBaseContent: (markdown: string) => void;
  setNotePage: (page: PageMetadataState) => void;
  setNotePageOriginal: (page: PageMetadataState) => void;
  workspaceUuid: string;
}

export function useFilePreviewNoteBootstrap({
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
}: UseFilePreviewNoteBootstrapOptions) {
  const activePageFromFileRef = useRef(activePageFromFile);

  useEffect(() => {
    activePageFromFileRef.current = activePageFromFile;
  }, [activePageFromFile]);

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
      setLoadedMarkdownFileId(activeFile.id);
      return;
    }

    if (inlineMarkdownSeed !== null) {
      setMarkdownLoading(false);
      setMarkdownError(null);
      setMarkdownOriginal(inlineMarkdownSeed);
      setMarkdownDraft(inlineMarkdownSeed);
      setNoteBaseContent(inlineMarkdownSeed);
      setNotePage(activePageFromFile);
      setNotePageOriginal(activePageFromFile);
      setLoadedMarkdownFileId(activeFile.id);
      writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
        body: inlineMarkdownSeed,
        content: inlineMarkdownSeed,
        page: activePageFromFile,
        updatedAt: activeFileUpdatedAt,
      });
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
  }, [
    activeFile.id,
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
  ]);

  useEffect(() => {
    if (!(workspaceUuid && activeFileIsMarkdown)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const hasWarmMarkdown =
      Boolean(matchingCachedMarkdown) || inlineMarkdownSeed !== null;

    if (hasWarmMarkdown) {
      setMarkdownLoading(false);
      setMarkdownError(null);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    setMarkdownLoading(true);
    setMarkdownError(null);

    loadFilePreviewMarkdownNote({
      fileId: activeFile.id,
      signal: controller.signal,
    })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const markdown = payload.markdown ?? "";
        const page = normalizePageMetadataState(
          payload.page ?? activePageFromFileRef.current
        );
        setMarkdownOriginal(markdown);
        setMarkdownDraft(markdown);
        setNoteBaseContent(markdown);
        setNotePage(page);
        setNotePageOriginal(page);
        setLoadedMarkdownFileId(activeFile.id);
        writeWorkspaceMarkdownCache(workspaceUuid, activeFile.id, {
          body: markdown,
          content: markdown,
          page,
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
    };
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    inlineMarkdownSeed,
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
  ]);
}
