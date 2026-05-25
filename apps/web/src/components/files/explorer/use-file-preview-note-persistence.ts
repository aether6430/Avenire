"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { WorkspaceInvalidationDetail } from "@/components/dashboard/workspace-realtime-bridge";
import {
  loadFilePreviewMarkdownNote,
  saveFilePreviewNoteMetadata,
  syncFilePreviewMarkdownNote,
} from "@/components/files/explorer/file-preview-note-client";
import type { FileRecord } from "@/components/files/explorer/shared";
import {
  arePageMetadataStatesEqual,
  type PageMetadataState,
} from "@/lib/frontmatter";
import { writeWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";

interface UseFilePreviewNotePersistenceOptions {
  activeFile: FileRecord;
  activeFileIsMarkdown: boolean;
  activeFileUpdatedAt: string | null;
  loadedMarkdownFileId: string | null;
  markdownBody: string;
  markdownOriginal: string;
  noteBaseContent: string;
  notePage: PageMetadataState;
  notePageOriginal: PageMetadataState;
  setLoadedMarkdownFileId: (fileId: string) => void;
  setMarkdownDraft: (markdown: string) => void;
  setMarkdownOriginal: (markdown: string) => void;
  setNoteBaseContent: (markdown: string) => void;
  setNotePageOriginal: (page: PageMetadataState) => void;
  workspaceUuid: string;
}

export function useFilePreviewNotePersistence({
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
}: UseFilePreviewNotePersistenceOptions) {
  const [noteSaveState, setNoteSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const noteSyncDebounceRef = useRef<number | null>(null);
  const noteSyncInFlightRef = useRef(false);
  const noteSyncQueuedRef = useRef(false);
  const fileMetadataSaveTimerRef = useRef<number | null>(null);

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

  const runNoteSync = useCallback(async () => {
    const payload = await syncFilePreviewMarkdownNote({
      fileId: activeFile.id,
      base: latestNoteBaseContentRef.current,
      current: latestMarkdownBodyRef.current,
    });
    const current = latestMarkdownBodyRef.current;
    const merged = payload.merged ?? current;

    setNoteBaseContent(merged);
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
  }, [
    activeFile.id,
    setMarkdownDraft,
    setMarkdownOriginal,
    setNoteBaseContent,
    workspaceUuid,
  ]);

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
    markdownDirty,
    runNoteSync,
  ]);

  const saveFileMetadata = useCallback(async () => {
    if (activeFile.readOnly || !notePageDirty) {
      return;
    }

    const saved = await saveFilePreviewNoteMetadata({
      fileId: activeFile.id,
      isMarkdown: activeFileIsMarkdown,
      page: notePage,
      workspaceUuid,
    });

    if (!saved) {
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
    setNotePageOriginal,
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

      void loadFilePreviewMarkdownNote({ fileId: activeFile.id })
        .then((payload) => {
          const markdown = payload.markdown ?? "";
          setMarkdownOriginal(markdown);
          setMarkdownDraft(markdown);
          setNoteBaseContent(markdown);
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
  }, [
    activeFile.id,
    activeFileIsMarkdown,
    markdownOriginal,
    setLoadedMarkdownFileId,
    setMarkdownDraft,
    setMarkdownOriginal,
    setNoteBaseContent,
    workspaceUuid,
  ]);

  useEffect(() => {
    setNoteSaveState("idle");
  }, []);

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

  return {
    noteSaveState,
  };
}
