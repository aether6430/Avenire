"use client";

import { useCallback } from "react";
import {
  runExplorerUploadBatch,
  type UploadResultLike,
} from "@/components/files/explorer/explorer-upload-batch";
import { collectDroppedExplorerUploadCandidates } from "@/components/files/explorer/explorer-upload-dropzone";
import type {
  ExplorerUploadCandidate,
  ExplorerUploadQueueItem,
} from "@/components/files/explorer/explorer-upload-model";
import type { FolderRecord } from "@/components/files/explorer/shared";

interface UseExplorerUploadWorkflowsOptions {
  allFolders: FolderRecord[];
  currentFolderId: string;
  emitSync: () => void;
  isCurrentFolderReadOnly: boolean;
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  setUploadQueue: (
    updater:
      | ExplorerUploadQueueItem[]
      | ((previous: ExplorerUploadQueueItem[]) => ExplorerUploadQueueItem[])
  ) => void;
  startUpload: (files: File[]) => Promise<UploadResultLike[] | undefined>;
  workspaceUuid: string;
}

export function useExplorerUploadWorkflows({
  allFolders,
  currentFolderId,
  emitSync,
  isCurrentFolderReadOnly,
  loadFolder,
  loadTree,
  setUploadQueue,
  startUpload,
  workspaceUuid,
}: UseExplorerUploadWorkflowsOptions) {
  const getDropUploadCandidates = useCallback(
    (event: React.DragEvent<HTMLDivElement>) =>
      collectDroppedExplorerUploadCandidates(event),
    []
  );

  const queueUploads = useCallback(
    (incomingCandidates: ExplorerUploadCandidate[]) => {
      if (
        !(workspaceUuid && currentFolderId) ||
        incomingCandidates.length === 0 ||
        isCurrentFolderReadOnly
      ) {
        return;
      }

      void runExplorerUploadBatch({
        allFolders,
        candidates: incomingCandidates,
        currentFolderId,
        emitSync,
        loadFolder,
        loadTree,
        setUploadQueue,
        startUpload,
        workspaceUuid,
      });
    },
    [
      allFolders,
      currentFolderId,
      emitSync,
      isCurrentFolderReadOnly,
      loadFolder,
      loadTree,
      setUploadQueue,
      startUpload,
      workspaceUuid,
    ]
  );

  return {
    getDropUploadCandidates,
    queueUploads,
  };
}
