import type {
  FilesActivityItem,
  FilesActivityStatus,
} from "@/stores/filesActivityStore";

export const WORKSPACE_FILES_ROUTE_REGEX = /^\/workspace\/files\/([^/]+)/;

export interface IngestionJobEvent {
  eventType: string;
  jobId: string;
  payload?: {
    error?: unknown;
    fileName?: unknown;
  };
}

export function getQueueStatusClass(status: FilesActivityStatus) {
  if (status === "failed") {
    return "bg-destructive";
  }

  if (status === "uploaded") {
    return "bg-emerald-500";
  }

  return "bg-primary";
}

export function mapIngestionEventStatus(
  eventType: string
): FilesActivityStatus {
  if (eventType === "job.failed") {
    return "failed";
  }

  if (eventType === "job.succeeded") {
    return "uploaded";
  }

  return "ingesting";
}

export function mapRecentJobStatus(
  status: "failed" | "queued" | "running" | "succeeded"
): FilesActivityStatus {
  if (status === "running") {
    return "ingesting";
  }

  if (status === "succeeded") {
    return "uploaded";
  }

  return status;
}

export function getIngestionErrorMessage(
  payload: IngestionJobEvent["payload"],
  status: FilesActivityStatus
) {
  if (status !== "failed") {
    return undefined;
  }

  if (typeof payload?.error === "string") {
    return payload.error.length > 60
      ? `${payload.error.substring(0, 60)}...`
      : payload.error;
  }

  return "Failed to process file";
}

export function createIngestionQueueItem(input: {
  fileName: string;
  jobId: string;
  status: FilesActivityStatus;
}): FilesActivityItem {
  return {
    error: undefined,
    id: `job:${input.jobId}`,
    ingestionJobId: input.jobId,
    name: input.fileName,
    sizeLabel: "—",
    status: input.status,
  };
}

export function updateIngestionQueueItem(
  item: FilesActivityItem,
  event: IngestionJobEvent,
  status: FilesActivityStatus
) {
  const nextError = getIngestionErrorMessage(event.payload, status);
  return {
    ...item,
    error: nextError,
    failureCount: status === "failed" ? (item.failureCount ?? 0) + 1 : 0,
    status,
  };
}

export function summarizeUploadQueue(queue: FilesActivityItem[]) {
  const uploadCount = queue.filter(
    (item) =>
      item.status === "queued" ||
      item.status === "uploading" ||
      item.status === "ingesting"
  ).length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const completedCount = queue.filter(
    (item) => item.status === "uploaded"
  ).length;

  return {
    completedCount,
    failedCount,
    hasActiveUploads: uploadCount > 0,
    uploadCount,
  };
}

export function resolveUploadActivityErrorMessage(
  error: unknown,
  fallback = "Unable to load upload activity."
) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

export function getUploadActivityEmptyState(input: {
  errorMessage?: string | null;
  itemCount: number;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading && input.itemCount === 0) {
    return {
      description: "Recent uploads are still loading.",
      title: "Loading upload activity...",
    };
  }

  if (input.loadFailed && input.itemCount === 0) {
    return {
      description:
        input.errorMessage?.trim() ||
        "Try again in a moment to reload recent uploads and ingestion jobs.",
      title: "Unable to load upload activity.",
    };
  }

  if (input.itemCount === 0) {
    return {
      description:
        "Upload something to keep track of progress, ingestion, and any failures in one place.",
      title: "No activity yet",
    };
  }

  return null;
}

export function shouldEnableUploadActivityLiveQueries(input: {
  activeWorkspaceUuid: string | null;
  isFilesRoute: boolean;
  queueLength: number;
  uploadActivityOpen: boolean;
}) {
  return Boolean(
    input.activeWorkspaceUuid &&
      input.isFilesRoute &&
      (input.uploadActivityOpen || input.queueLength > 0)
  );
}
