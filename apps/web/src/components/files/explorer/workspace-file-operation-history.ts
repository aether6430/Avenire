import {
  type BulkActionItem,
  type BulkMutationResponse,
  countMutationHistoryItems,
  describeMutationHistoryEntry,
  type FileMutationHistoryEntry,
  type FileMutationHistoryItem,
  filterMutationHistoryEntry,
  getSuccessfulBulkMutationKeys,
  getSuccessfulTrashMutationKeys,
  subtractMutationHistoryKeys,
  type TrashMutationResponse,
} from "@/components/files/explorer/workspace-bulk-operations-model";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastPort {
  error: (message: string) => void;
  success: (
    message: string,
    options?: {
      action?: ToastAction;
      id?: string;
    }
  ) => void;
}

export function pushWorkspaceFileOperationHistoryEntry({
  entry,
  onUndoRequested,
  redoStack,
  toastId,
  toastPort,
  totalCount = countMutationHistoryItems(entry),
  undoStack,
  syncState,
}: {
  entry: FileMutationHistoryEntry;
  onUndoRequested: () => void;
  redoStack: FileMutationHistoryEntry[];
  toastId: string;
  toastPort: ToastPort;
  totalCount?: number;
  undoStack: FileMutationHistoryEntry[];
  syncState: () => void;
}) {
  undoStack.push(entry);
  redoStack.length = 0;
  syncState();

  const successfulCount = countMutationHistoryItems(entry);
  toastPort.success(
    describeMutationHistoryEntry(entry, "normal", successfulCount, totalCount),
    {
      action: {
        label: "Undo",
        onClick: onUndoRequested,
      },
      id: toastId,
    }
  );
}

async function runMoveHistoryMutation({
  items,
  mode,
  runBulkMutation,
}: {
  items: Extract<FileMutationHistoryEntry, { operation: "move" }>["items"];
  mode: "redo" | "undo";
  runBulkMutation: (payload: {
    items: BulkActionItem[];
    operation: "delete" | "move";
    targetFolderId?: string;
  }) => Promise<BulkMutationResponse | null>;
}) {
  const itemsByTargetFolderId = new Map<string, BulkActionItem[]>();

  for (const item of items) {
    const targetFolderId =
      mode === "undo" ? item.fromFolderId : item.toFolderId;
    const existing = itemsByTargetFolderId.get(targetFolderId) ?? [];
    existing.push({ id: item.id, kind: item.kind });
    itemsByTargetFolderId.set(targetFolderId, existing);
  }

  const successfulKeys = new Set<string>();

  for (const [
    targetFolderId,
    groupedItems,
  ] of itemsByTargetFolderId.entries()) {
    const result = await runBulkMutation({
      items: groupedItems,
      operation: "move",
      targetFolderId,
    });

    for (const key of getSuccessfulBulkMutationKeys(result)) {
      successfulKeys.add(key);
    }
  }

  return successfulKeys;
}

export async function applyWorkspaceFileOperationHistory({
  busy,
  mode,
  redoStack,
  refreshAfterMutation,
  restoreItemsFromTrash,
  runBulkMutation,
  setBusy,
  syncState,
  toastId,
  toastPort,
  undoStack,
}: {
  busy: boolean;
  mode: "redo" | "undo";
  redoStack: FileMutationHistoryEntry[];
  refreshAfterMutation: () => Promise<void>;
  restoreItemsFromTrash: (
    items: FileMutationHistoryItem[]
  ) => Promise<TrashMutationResponse | null>;
  runBulkMutation: (payload: {
    items: BulkActionItem[];
    operation: "delete" | "move";
    targetFolderId?: string;
  }) => Promise<BulkMutationResponse | null>;
  setBusy: (nextBusy: boolean) => void;
  syncState: () => void;
  toastId: string;
  toastPort: ToastPort;
  undoStack: FileMutationHistoryEntry[];
}) {
  if (busy) {
    return;
  }

  const sourceStack = mode === "undo" ? undoStack : redoStack;
  const targetStack = mode === "undo" ? redoStack : undoStack;
  const entry = sourceStack.at(-1);

  if (!entry) {
    return;
  }

  setBusy(true);

  try {
    const totalCount = countMutationHistoryItems(entry);
    const successfulKeys =
      entry.operation === "delete"
        ? mode === "undo"
          ? getSuccessfulTrashMutationKeys(
              await restoreItemsFromTrash(entry.items)
            )
          : getSuccessfulBulkMutationKeys(
              await runBulkMutation({
                items: entry.items,
                operation: "delete",
              })
            )
        : await runMoveHistoryMutation({
            items: entry.items,
            mode,
            runBulkMutation,
          });

    if (successfulKeys.size === 0) {
      throw new Error(
        mode === "undo"
          ? "Unable to undo the last file operation."
          : "Unable to redo the last file operation."
      );
    }

    const successfulEntry = filterMutationHistoryEntry(entry, successfulKeys);
    const failedEntry = subtractMutationHistoryKeys(entry, successfulKeys);

    sourceStack.pop();
    if (failedEntry) {
      sourceStack.push(failedEntry);
    }
    if (successfulEntry) {
      targetStack.push(successfulEntry);
    }
    syncState();

    await refreshAfterMutation();

    if (successfulEntry) {
      toastPort.success(
        describeMutationHistoryEntry(
          successfulEntry,
          mode,
          countMutationHistoryItems(successfulEntry),
          totalCount
        ),
        {
          id: toastId,
        }
      );
    }
  } catch (error) {
    toastPort.error(
      error instanceof Error
        ? error.message
        : mode === "undo"
          ? "Unable to undo the last file operation."
          : "Unable to redo the last file operation."
    );
  } finally {
    setBusy(false);
  }
}
