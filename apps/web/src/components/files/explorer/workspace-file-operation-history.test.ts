import { describe, expect, it, vi } from "vitest";
import type { FileMutationHistoryEntry } from "@/components/files/explorer/workspace-bulk-operations-model";
import {
  applyWorkspaceFileOperationHistory,
  pushWorkspaceFileOperationHistoryEntry,
} from "@/components/files/explorer/workspace-file-operation-history";

describe("workspace file operation history", () => {
  it("pushes new history entries onto undo, clears redo, and emits undo-capable toast copy", () => {
    const undoStack: FileMutationHistoryEntry[] = [];
    const redoStack: FileMutationHistoryEntry[] = [
      { items: [{ id: "file-stale", kind: "file" }], operation: "delete" },
    ];
    const syncState = vi.fn();
    const onUndoRequested = vi.fn();
    const toastPort = {
      error: vi.fn(),
      success: vi.fn(),
    };

    pushWorkspaceFileOperationHistoryEntry({
      entry: {
        items: [{ id: "file-a", kind: "file" }],
        operation: "delete",
      },
      onUndoRequested,
      redoStack,
      syncState,
      toastId: "history-toast",
      toastPort,
      undoStack,
    });

    expect(undoStack).toEqual([
      { items: [{ id: "file-a", kind: "file" }], operation: "delete" },
    ]);
    expect(redoStack).toEqual([]);
    expect(syncState).toHaveBeenCalledTimes(1);
    expect(toastPort.success).toHaveBeenCalledWith("Deleted 1 item.", {
      action: {
        label: "Undo",
        onClick: onUndoRequested,
      },
      id: "history-toast",
    });
  });

  it("undoes delete history through trash restore and moves successful items into redo", async () => {
    const undoStack: FileMutationHistoryEntry[] = [
      {
        items: [
          { id: "file-a", kind: "file" },
          { id: "folder-a", kind: "folder" },
        ],
        operation: "delete",
      },
    ];
    const redoStack: FileMutationHistoryEntry[] = [];
    const setBusy = vi.fn();
    const syncState = vi.fn();
    const refreshAfterMutation = vi.fn(async () => undefined);
    const restoreItemsFromTrash = vi.fn(async () => ({
      results: [
        { id: "file-a", kind: "file" as const, ok: true },
        { id: "folder-a", kind: "folder" as const, ok: false },
      ],
    }));
    const runBulkMutation = vi.fn();
    const toastPort = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await applyWorkspaceFileOperationHistory({
      busy: false,
      mode: "undo",
      redoStack,
      refreshAfterMutation,
      restoreItemsFromTrash,
      runBulkMutation,
      setBusy,
      syncState,
      toastId: "history-toast",
      toastPort,
      undoStack,
    });

    expect(restoreItemsFromTrash).toHaveBeenCalledWith([
      { id: "file-a", kind: "file" },
      { id: "folder-a", kind: "folder" },
    ]);
    expect(runBulkMutation).not.toHaveBeenCalled();
    expect(undoStack).toEqual([
      {
        items: [{ id: "folder-a", kind: "folder" }],
        operation: "delete",
      },
    ]);
    expect(redoStack).toEqual([
      {
        items: [{ id: "file-a", kind: "file" }],
        operation: "delete",
      },
    ]);
    expect(syncState).toHaveBeenCalledTimes(1);
    expect(refreshAfterMutation).toHaveBeenCalledTimes(1);
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
    expect(toastPort.success).toHaveBeenCalledWith(
      "Undid delete of 1 of 2 items.",
      { id: "history-toast" }
    );
  });

  it("redos move history by grouping items per target folder", async () => {
    const undoStack: FileMutationHistoryEntry[] = [];
    const redoStack: FileMutationHistoryEntry[] = [
      {
        items: [
          {
            fromFolderId: "folder-a",
            id: "file-a",
            kind: "file",
            toFolderId: "folder-b",
          },
          {
            fromFolderId: "folder-root",
            id: "folder-c",
            kind: "folder",
            toFolderId: "folder-b",
          },
        ],
        operation: "move",
      },
    ];
    const setBusy = vi.fn();
    const syncState = vi.fn();
    const refreshAfterMutation = vi.fn(async () => undefined);
    const restoreItemsFromTrash = vi.fn();
    const runBulkMutation = vi.fn(async () => ({
      results: [
        { id: "file-a", kind: "file" as const, status: "ok" as const },
        { id: "folder-c", kind: "folder" as const, status: "ok" as const },
      ],
    }));
    const toastPort = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await applyWorkspaceFileOperationHistory({
      busy: false,
      mode: "redo",
      redoStack,
      refreshAfterMutation,
      restoreItemsFromTrash,
      runBulkMutation,
      setBusy,
      syncState,
      toastId: "history-toast",
      toastPort,
      undoStack,
    });

    expect(runBulkMutation).toHaveBeenCalledWith({
      items: [
        { id: "file-a", kind: "file" },
        { id: "folder-c", kind: "folder" },
      ],
      operation: "move",
      targetFolderId: "folder-b",
    });
    expect(redoStack).toEqual([]);
    expect(undoStack).toEqual([
      {
        items: [
          {
            fromFolderId: "folder-a",
            id: "file-a",
            kind: "file",
            toFolderId: "folder-b",
          },
          {
            fromFolderId: "folder-root",
            id: "folder-c",
            kind: "folder",
            toFolderId: "folder-b",
          },
        ],
        operation: "move",
      },
    ]);
    expect(syncState).toHaveBeenCalledTimes(1);
    expect(refreshAfterMutation).toHaveBeenCalledTimes(1);
    expect(toastPort.success).toHaveBeenCalledWith("Redid move of 2 items.", {
      id: "history-toast",
    });
  });
});
