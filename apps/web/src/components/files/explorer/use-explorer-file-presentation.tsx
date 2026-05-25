"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildExplorerWikiLinkableFiles,
  canStartExplorerFileHoverPreview,
  type ExplorerFileKind,
  getExplorerFileKind,
} from "@/components/files/explorer/explorer-file-presentation-model";
import { getExplorerFileVisualIcon } from "@/components/files/explorer/explorer-file-visual-icon";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspaceFileIndex } from "@/lib/workspace-file-index";

interface UseExplorerFilePresentationOptions {
  workspaceFileIndex: WorkspaceFileIndex<any, FileRecord>;
}

export function useExplorerFilePresentation({
  workspaceFileIndex,
}: UseExplorerFilePresentationOptions) {
  const [hoveredPreviewFileId, setHoveredPreviewFileId] = useState<
    string | null
  >(null);

  const wikiLinkableFiles = useMemo(
    () => buildExplorerWikiLinkableFiles(workspaceFileIndex.files),
    [workspaceFileIndex.files]
  );

  const detectFileKind = useCallback((file: FileRecord) => {
    return getExplorerFileKind(file);
  }, []);

  const getFileVisualIcon = useCallback(
    (
      file: Pick<FileRecord, "page">,
      fileKind: ExplorerFileKind,
      className = "size-3.5"
    ) => getExplorerFileVisualIcon(file, fileKind, className),
    []
  );

  const handlePreviewIntentStart = useCallback((file: FileRecord) => {
    if (!canStartExplorerFileHoverPreview(file)) {
      return;
    }

    setHoveredPreviewFileId(file.id);
  }, []);

  const handlePreviewIntentEnd = useCallback((file: FileRecord) => {
    if (!canStartExplorerFileHoverPreview(file)) {
      return;
    }

    setHoveredPreviewFileId((previous) =>
      previous === file.id ? null : previous
    );
  }, []);

  return {
    detectFileKind,
    getFileVisualIcon,
    handlePreviewIntentEnd,
    handlePreviewIntentStart,
    hoveredPreviewFileId,
    wikiLinkableFiles,
  };
}
