import { describe, expect, it } from "vitest";
import {
  applyExplorerIngestionJobEvent,
  parseExplorerFilesInvalidationPayload,
  parseExplorerIngestionJobEventPayload,
} from "@/components/files/explorer/explorer-realtime-model";
import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";

describe("Explorer realtime model", () => {
  it("parses realtime payloads safely", () => {
    expect(
      parseExplorerFilesInvalidationPayload('{"folderId":"folder-1"}')
    ).toEqual({ folderId: "folder-1" });
    expect(parseExplorerFilesInvalidationPayload("{nope")).toBeNull();

    expect(
      parseExplorerIngestionJobEventPayload(
        '{"jobId":"job-1","eventType":"job.succeeded"}'
      )
    ).toEqual({ eventType: "job.succeeded", jobId: "job-1" });
    expect(parseExplorerIngestionJobEventPayload("{nope")).toBeNull();
  });

  it("maps ingestion events onto the matching upload queue item", () => {
    const queue: ExplorerUploadQueueItem[] = [
      {
        id: "upload-1",
        ingestionJobId: "job-1",
        name: "alpha.pdf",
        sizeLabel: "1 MB",
        status: "uploading",
      },
      {
        id: "upload-2",
        ingestionJobId: "job-2",
        name: "beta.pdf",
        sizeLabel: "2 MB",
        status: "queued",
      },
    ];

    const ingesting = applyExplorerIngestionJobEvent(queue, {
      eventType: "job.started",
      jobId: "job-1",
    });
    expect(ingesting[0]?.status).toBe("ingesting");
    expect(ingesting[1]?.status).toBe("queued");

    const failed = applyExplorerIngestionJobEvent(ingesting, {
      eventType: "job.failed",
      jobId: "job-1",
      payload: { error: "OCR timeout" },
    });
    expect(failed[0]).toMatchObject({
      error: "Ingestion failed for this file: OCR timeout",
      failureCount: 1,
      status: "failed",
    });

    const succeeded = applyExplorerIngestionJobEvent(failed, {
      eventType: "job.succeeded",
      jobId: "job-1",
    });
    expect(succeeded[0]).toMatchObject({
      error: undefined,
      failureCount: 0,
      status: "uploaded",
    });
  });
});
