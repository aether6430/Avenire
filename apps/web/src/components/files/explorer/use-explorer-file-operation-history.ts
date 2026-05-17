"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  BulkItemKind,
  BulkMutationResponse,
  FileMutationHistoryEntry,
  FileMutationHistoryItem,
  TrashMutationResponse,
} from "@/components/files/explorer/workspace-bulk-operations-model";
import {
  applyWorkspaceFileOperationHistory,
  pushWorkspaceFileOperationHistoryEntry,
} from "@/components/files/explorer/workspace-file-operation-history";

const FILE_OPERATION_HISTORY_TOAST_ID = "files-operation-history";

interface UseExplorerFileOperationHistoryOptions {
  refreshAfterMutation: () => Promise<void>;
  restoreItemsFromTrash: (
    items: FileMutationHistoryItem[]
  ) => Promise<TrashMutationResponse | null>;
  runBulkMutation: (payload: {
    items: Array<{ id: string; kind: BulkItemKind }>;
    operation: "delete" | "move";
    targetFolderId?: string;
  }) => Promise<BulkMutationResponse | null>;
}

export function useExplorerFileOperationHistory({
  refreshAfterMutation,
  restoreItemsFromTrash,
  runBulkMutation,
}: UseExplorerFileOperationHistoryOptions) {
  const [fileOperationHistoryState, setFileOperationHistoryState] = useState({
    redoCount: 0,
    undoCount: 0,
  });
  const [fileOperationHistoryBusy, setFileOperationHistoryBusy] =
    useState(false);
  const undoFileOperationHistoryRef = useRef<FileMutationHistoryEntry[]>([]);
  const redoFileOperationHistoryRef = useRef<FileMutationHistoryEntry[]>([]);

  const syncFileOperationHistoryState = useCallback(() => {
    setFileOperationHistoryState({
      redoCount: redoFileOperationHistoryRef.current.length,
      undoCount: undoFileOperationHistoryRef.current.length,
    });
  }, []);

  const applyFileOperationHistory = useCallback(
    async (mode: "redo" | "undo") => {
      await applyWorkspaceFileOperationHistory({
        busy: fileOperationHistoryBusy,
        mode,
        redoStack: redoFileOperationHistoryRef.current,
        refreshAfterMutation,
        restoreItemsFromTrash,
        runBulkMutation,
        setBusy: setFileOperationHistoryBusy,
        syncState: syncFileOperationHistoryState,
        toastId: FILE_OPERATION_HISTORY_TOAST_ID,
        toastPort: {
          error: toast.error,
          success: toast.success,
        },
        undoStack: undoFileOperationHistoryRef.current,
      });
    },
    [
      fileOperationHistoryBusy,
      refreshAfterMutation,
      restoreItemsFromTrash,
      runBulkMutation,
      syncFileOperationHistoryState,
    ]
  );

  const undoLatestFileOperation = useCallback(async () => {
    await applyFileOperationHistory("undo");
  }, [applyFileOperationHistory]);

  const redoLatestFileOperation = useCallback(async () => {
    await applyFileOperationHistory("redo");
  }, [applyFileOperationHistory]);

  const pushMutationHistoryEntry = useCallback(
    (entry: FileMutationHistoryEntry, totalCount?: number) => {
      pushWorkspaceFileOperationHistoryEntry({
        entry,
        onUndoRequested: () => {
          void undoLatestFileOperation();
        },
        redoStack: redoFileOperationHistoryRef.current,
        syncState: syncFileOperationHistoryState,
        toastId: FILE_OPERATION_HISTORY_TOAST_ID,
        toastPort: {
          error: toast.error,
          success: toast.success,
        },
        totalCount,
        undoStack: undoFileOperationHistoryRef.current,
      });
    },
    [syncFileOperationHistoryState, undoLatestFileOperation]
  );

  return {
    canRedoFileOperation: fileOperationHistoryState.redoCount > 0,
    canUndoFileOperation: fileOperationHistoryState.undoCount > 0,
    fileOperationHistoryBusy,
    pushMutationHistoryEntry,
    redoLatestFileOperation,
    undoLatestFileOperation,
  };
}
