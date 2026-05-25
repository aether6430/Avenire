import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";

export interface ExplorerUploadDedupeHit {
  fileId?: string;
}

export interface ExplorerBulkRegisterResult {
  clientUploadId: string;
  error?: string;
  file?: { id?: string };
  ingestionJob?: { id?: string } | null;
  status: "failed" | "ok";
}

export function applyExplorerDedupeHitsToQueue(
  previous: ExplorerUploadQueueItem[],
  dedupeHitByQueueId: Map<string, ExplorerUploadDedupeHit>
) {
  return previous.map((item) => {
    const hit = dedupeHitByQueueId.get(item.id);
    if (!hit) {
      return item;
    }

    return {
      ...item,
      error: undefined,
      failureCount: 0,
      fileId: hit.fileId,
      status: "uploaded" as const,
    };
  });
}

export function countSuccessfulExplorerRegisterResults(
  results: ExplorerBulkRegisterResult[]
) {
  return results.filter((result) => result.status === "ok").length;
}

export function applyExplorerRegisterResultsToQueue(
  previous: ExplorerUploadQueueItem[],
  results: ExplorerBulkRegisterResult[]
) {
  const resultMap = new Map(
    results.map((result) => [result.clientUploadId, result])
  );

  return previous.map((item) => {
    const result = resultMap.get(item.id);
    if (!result) {
      return item;
    }

    if (result.status === "ok") {
      return {
        ...item,
        error: undefined,
        failureCount: 0,
        fileId: result.file?.id,
        ingestionJobId: result.ingestionJob?.id,
        status: result.ingestionJob?.id
          ? ("ingesting" as const)
          : ("uploaded" as const),
      };
    }

    return {
      ...item,
      error: result.error ?? "File metadata registration failed",
      failureCount: (item.failureCount ?? 0) + 1,
      status: "failed" as const,
    };
  });
}

export function applyExplorerRegisterFailureToQueue(
  previous: ExplorerUploadQueueItem[],
  queueItemIds: string[],
  message: string
) {
  return previous.map((item) =>
    queueItemIds.includes(item.id)
      ? {
          ...item,
          error: message,
          failureCount: (item.failureCount ?? 0) + 1,
          status: "failed" as const,
        }
      : item
  );
}
