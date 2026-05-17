import { describe, expect, it } from "vitest";
import {
  applyExplorerDedupeHitsToQueue,
  applyExplorerRegisterFailureToQueue,
  applyExplorerRegisterResultsToQueue,
  countSuccessfulExplorerRegisterResults,
} from "@/components/files/explorer/explorer-upload-batch-model";
import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";

describe("explorer upload batch model", () => {
  it("marks deduped queue items uploaded and clears prior failures", () => {
    const queue: ExplorerUploadQueueItem[] = [
      {
        error: "old failure",
        failureCount: 2,
        id: "queue-1",
        name: "note.md",
        sizeLabel: "1 KB",
        status: "failed",
      },
      {
        id: "queue-2",
        name: "clip.mp4",
        sizeLabel: "4 MB",
        status: "queued",
      },
    ];

    const updated = applyExplorerDedupeHitsToQueue(
      queue,
      new Map([["queue-1", { fileId: "file-1" }]])
    );

    expect(updated[0]).toMatchObject({
      error: undefined,
      failureCount: 0,
      fileId: "file-1",
      status: "uploaded",
    });
    expect(updated[1]).toEqual(queue[1]);
  });

  it("applies register results with ingesting and failed states", () => {
    const queue: ExplorerUploadQueueItem[] = [
      {
        id: "queue-1",
        name: "note.md",
        sizeLabel: "1 KB",
        status: "uploaded",
      },
      {
        failureCount: 1,
        id: "queue-2",
        name: "clip.mp4",
        sizeLabel: "4 MB",
        status: "uploaded",
      },
    ];

    const updated = applyExplorerRegisterResultsToQueue(queue, [
      {
        clientUploadId: "queue-1",
        file: { id: "file-1" },
        ingestionJob: { id: "job-1" },
        status: "ok",
      },
      {
        clientUploadId: "queue-2",
        error: "Registration failed",
        status: "failed",
      },
    ]);

    expect(updated[0]).toMatchObject({
      fileId: "file-1",
      ingestionJobId: "job-1",
      status: "ingesting",
    });
    expect(updated[1]).toMatchObject({
      error: "Registration failed",
      failureCount: 2,
      status: "failed",
    });
    expect(
      countSuccessfulExplorerRegisterResults([
        { clientUploadId: "queue-1", status: "ok" },
        { clientUploadId: "queue-2", status: "failed" },
      ])
    ).toBe(1);
  });

  it("marks selected queue items failed when bulk registration throws", () => {
    const queue: ExplorerUploadQueueItem[] = [
      {
        id: "queue-1",
        name: "note.md",
        sizeLabel: "1 KB",
        status: "uploaded",
      },
      {
        id: "queue-2",
        name: "clip.mp4",
        sizeLabel: "4 MB",
        status: "uploaded",
      },
    ];

    const updated = applyExplorerRegisterFailureToQueue(
      queue,
      ["queue-1"],
      "File metadata registration failed"
    );

    expect(updated[0]).toMatchObject({
      error: "File metadata registration failed",
      failureCount: 1,
      status: "failed",
    });
    expect(updated[1]).toEqual(queue[1]);
  });
});
