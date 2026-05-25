"use client";

import type {
  BulkItemKind,
  BulkMutationResponse,
  FileMutationHistoryItem,
  TrashMutationResponse,
} from "@/components/files/explorer/workspace-bulk-operations-model";

async function parseExplorerMutationError(
  response: Response,
  fallbackMessage: string
) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return payload.error ?? fallbackMessage;
}

export async function runExplorerBulkMutation(options: {
  payload: {
    items: Array<{ id: string; kind: BulkItemKind }>;
    operation: "delete" | "move";
    targetFolderId?: string;
  };
  workspaceUuid: string;
}) {
  const { payload, workspaceUuid } = options;
  if (!(workspaceUuid && payload.items.length > 0)) {
    return null;
  }

  const response = await fetch(`/api/workspaces/${workspaceUuid}/items/bulk`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await parseExplorerMutationError(response, "Bulk operation failed")
    );
  }

  return (await response.json()) as BulkMutationResponse;
}

export async function restoreExplorerItemsFromTrash(options: {
  items: FileMutationHistoryItem[];
  workspaceUuid: string;
}) {
  const { items, workspaceUuid } = options;
  if (!(workspaceUuid && items.length > 0)) {
    return null;
  }

  const response = await fetch(`/api/workspaces/${workspaceUuid}/trash`, {
    body: JSON.stringify({
      items,
      operation: "restore",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await parseExplorerMutationError(
        response,
        "Unable to restore items from trash."
      )
    );
  }

  return (await response.json()) as TrashMutationResponse;
}

export async function moveExplorerFolderTransport(options: {
  folderId: string;
  targetFolderId: string;
  workspaceUuid: string;
}) {
  const { folderId, targetFolderId, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/folders/${folderId}`,
    {
      body: JSON.stringify({ parentId: targetFolderId }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to move folder.");
  }
}

export async function duplicateExplorerItemTransport(options: {
  item: { id: string; kind: "file" | "folder"; parentId?: string | null };
  workspaceUuid: string;
}) {
  const { item, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/items/duplicate`,
    {
      body: JSON.stringify({
        id: item.id,
        kind: item.kind,
        parentId: item.parentId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );

  return response.ok;
}

export async function queueExplorerHardReingestTransport(options: {
  fileId: string;
  workspaceUuid: string;
}) {
  const { fileId, workspaceUuid } = options;
  const response = await fetch(
    `/api/workspaces/${workspaceUuid}/files/${fileId}/reingest`,
    {
      method: "POST",
    }
  );

  if (response.ok) {
    return { ok: true as const };
  }

  return {
    error: await parseExplorerMutationError(
      response,
      "Unable to re-ingest file."
    ),
    ok: false as const,
  };
}
