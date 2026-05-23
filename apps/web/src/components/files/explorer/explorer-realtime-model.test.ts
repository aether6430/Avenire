import { describe, expect, it } from "vitest";
import {
  applyExplorerFilesRealtimeInvalidation,
  applyExplorerIngestionJobEvent,
  collectExplorerDeletedFolderIds,
  parseExplorerFilesInvalidationPayload,
  parseExplorerIngestionJobEventPayload,
  shouldEnableExplorerRealtime,
} from "@/components/files/explorer/explorer-realtime-model";
import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

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

  it("only enables explorer realtime when uploads are still active", () => {
    expect(
      shouldEnableExplorerRealtime([
        {
          id: "upload-1",
          name: "alpha.pdf",
          sizeLabel: "1 MB",
          status: "uploaded",
        },
      ])
    ).toBe(false);

    expect(
      shouldEnableExplorerRealtime([
        {
          id: "upload-1",
          name: "alpha.pdf",
          sizeLabel: "1 MB",
          status: "queued",
        },
      ])
    ).toBe(true);
  });

  it("filters explorer tree state after deleted file and folder invalidations", () => {
    const allFolders: FolderRecord[] = [
      {
        id: "root",
        name: "Workspace",
        parentId: null,
      },
      {
        id: "notes",
        name: "Notes",
        parentId: "root",
      },
      {
        id: "archive",
        name: "Archive",
        parentId: "notes",
      },
    ];
    const allFiles: FileRecord[] = [
      {
        createdAt: "2026-05-22T00:00:00.000Z",
        folderId: "notes",
        id: "file-a",
        mimeType: "text/markdown",
        name: "Welcome.md",
        sizeBytes: 128,
        storageUrl: "/welcome",
      },
      {
        createdAt: "2026-05-22T00:00:00.000Z",
        folderId: "archive",
        id: "file-b",
        mimeType: "application/pdf",
        name: "Old.pdf",
        sizeBytes: 256,
        storageUrl: "/old",
      },
    ];

    expect(collectExplorerDeletedFolderIds(allFolders, "notes")).toEqual(
      new Set(["notes", "archive"])
    );

    expect(
      applyExplorerFilesRealtimeInvalidation({
        allFiles,
        allFolders,
        detail: {
          fileId: "file-a",
          reason: "file.deleted",
        },
      })
    ).toEqual({
      allFiles: [allFiles[1]],
      allFolders,
      deletedFolderIds: new Set(),
    });

    expect(
      applyExplorerFilesRealtimeInvalidation({
        allFiles,
        allFolders,
        detail: {
          folderId: "notes",
          reason: "folder.deleted",
        },
      })
    ).toEqual({
      allFiles: [],
      allFolders: [allFolders[0]],
      deletedFolderIds: new Set(["notes", "archive"]),
    });
  });
});
