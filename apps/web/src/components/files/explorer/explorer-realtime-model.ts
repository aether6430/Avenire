import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";

export interface ExplorerFilesInvalidationPayload {
  folderId?: string | null;
  reason?: string;
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
