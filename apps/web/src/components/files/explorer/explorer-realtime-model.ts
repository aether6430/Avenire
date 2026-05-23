import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

export interface ExplorerFilesInvalidationPayload {
  fileId?: string | null;
  folderId?: string | null;
  reason?: string | null;
  workspaceUuid?: string;
}

export interface ExplorerIngestionJobEventPayload {
  eventType: string;
  jobId: string;
  payload?: Record<string, unknown>;
}

export function parseExplorerFilesInvalidationPayload(
  raw: string
): ExplorerFilesInvalidationPayload | null {
  try {
    return JSON.parse(raw) as ExplorerFilesInvalidationPayload;
  } catch {
    return null;
  }
}

export function parseExplorerIngestionJobEventPayload(
  raw: string
): ExplorerIngestionJobEventPayload | null {
  try {
    return JSON.parse(raw) as ExplorerIngestionJobEventPayload;
  } catch {
    return null;
  }
}

export function applyExplorerIngestionJobEvent(
  previous: ExplorerUploadQueueItem[],
  payload: ExplorerIngestionJobEventPayload
) {
  return previous.map((item) => {
    if (!item.ingestionJobId || item.ingestionJobId !== payload.jobId) {
      return item;
    }

    if (payload.eventType === "job.failed") {
      const nextFailureCount = (item.failureCount ?? 0) + 1;
      return {
        ...item,
        status: "failed" as const,
        failureCount: nextFailureCount,
        error:
          typeof payload.payload?.error === "string"
            ? `Ingestion failed for this file: ${payload.payload.error}`
            : "Ingestion failed",
      };
    }

    if (payload.eventType === "job.succeeded") {
      return {
        ...item,
        status: "uploaded" as const,
        error: undefined,
        failureCount: 0,
      };
    }

    return {
      ...item,
      status: "ingesting" as const,
      error: undefined,
    };
  });
}

export function shouldEnableExplorerRealtime(queue: ExplorerUploadQueueItem[]) {
  return queue.some(
    (item) =>
      item.status === "queued" ||
      item.status === "uploading" ||
      item.status === "ingesting"
  );
}

export function collectExplorerDeletedFolderIds(
  folders: FolderRecord[],
  folderId: string
) {
  const deletedIds = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (
        folder.parentId &&
        deletedIds.has(folder.parentId) &&
        !deletedIds.has(folder.id)
      ) {
        deletedIds.add(folder.id);
        changed = true;
      }
    }
  }

  return deletedIds;
}

export function applyExplorerFilesRealtimeInvalidation(input: {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  detail: ExplorerFilesInvalidationPayload | null;
}) {
  if (input.detail?.reason === "file.deleted" && input.detail.fileId) {
    return {
      allFiles: input.allFiles.filter(
        (file) => file.id !== input.detail?.fileId
      ),
      allFolders: input.allFolders,
      deletedFolderIds: new Set<string>(),
    };
  }

  if (input.detail?.reason === "folder.deleted" && input.detail.folderId) {
    const deletedFolderIds = collectExplorerDeletedFolderIds(
      input.allFolders,
      input.detail.folderId
    );

    return {
      allFiles: input.allFiles.filter(
        (file) => !deletedFolderIds.has(file.folderId)
      ),
      allFolders: input.allFolders.filter(
        (folder) => !deletedFolderIds.has(folder.id)
      ),
      deletedFolderIds,
    };
  }

  return null;
}
