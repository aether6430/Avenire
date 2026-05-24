import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createIngestionQueueItem,
  getIngestionErrorMessage,
  getUploadActivityEmptyState,
  mapIngestionEventStatus,
  mapRecentJobStatus,
  resolveUploadActivityErrorMessage,
  shouldEnableUploadActivityLiveQueries,
  summarizeUploadQueue,
  updateIngestionQueueItem,
} from "@/components/files/upload-activity-model";

const uploadActivityHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-upload-activity-panel.ts"),
  "utf8"
);

describe("upload activity model", () => {
  it("maps ingestion and recent-job statuses into queue statuses", () => {
    expect(mapIngestionEventStatus("job.failed")).toBe("failed");
    expect(mapIngestionEventStatus("job.succeeded")).toBe("uploaded");
    expect(mapIngestionEventStatus("job.started")).toBe("ingesting");

    expect(mapRecentJobStatus("failed")).toBe("failed");
    expect(mapRecentJobStatus("queued")).toBe("queued");
    expect(mapRecentJobStatus("running")).toBe("ingesting");
    expect(mapRecentJobStatus("succeeded")).toBe("uploaded");
  });

  it("keeps failed ingestion errors concise and ignores non-failed statuses", () => {
    const trimmedError = getIngestionErrorMessage(
      {
        error:
          "This is a very long ingestion error message that should be trimmed cleanly for the panel",
      },
      "failed"
    );

    expect(trimmedError).toBeDefined();
    expect(trimmedError?.endsWith("...")).toBe(true);
    expect(trimmedError?.length).toBe(63);

    expect(
      getIngestionErrorMessage({ error: "boom" }, "uploading")
    ).toBeUndefined();
  });

  it("creates and updates ingestion queue entries with failure state", () => {
    const initial = createIngestionQueueItem({
      fileName: "demo.pdf",
      jobId: "job-1",
      status: "ingesting",
    });

    expect(initial).toMatchObject({
      id: "job:job-1",
      ingestionJobId: "job-1",
      name: "demo.pdf",
      sizeLabel: "—",
      status: "ingesting",
    });

    const updated = updateIngestionQueueItem(
      initial,
      {
        eventType: "job.failed",
        jobId: "job-1",
        payload: { error: "pipeline exploded" },
      },
      "failed"
    );

    expect(updated).toMatchObject({
      error: "pipeline exploded",
      failureCount: 1,
      status: "failed",
    });
  });

  it("summarizes queue counts and active uploads", () => {
    const summary = summarizeUploadQueue([
      { id: "1", name: "a", sizeLabel: "1 KB", status: "queued" },
      { id: "2", name: "b", sizeLabel: "1 KB", status: "uploaded" },
      { id: "3", name: "c", sizeLabel: "1 KB", status: "failed" },
      { id: "4", name: "d", sizeLabel: "1 KB", status: "ingesting" },
    ]);

    expect(summary).toEqual({
      completedCount: 1,
      failedCount: 1,
      hasActiveUploads: true,
      uploadCount: 2,
    });
  });

  it("keeps upload activity loading, failure, and empty states distinct", () => {
    expect(
      getUploadActivityEmptyState({
        itemCount: 0,
        loadFailed: false,
        loading: true,
      })
    ).toEqual({
      description: "Recent uploads are still loading.",
      title: "Loading upload activity...",
    });

    expect(
      getUploadActivityEmptyState({
        errorMessage: "Recent uploads timed out.",
        itemCount: 0,
        loadFailed: true,
        loading: false,
      })
    ).toEqual({
      description: "Recent uploads timed out.",
      title: "Unable to load upload activity.",
    });

    expect(
      getUploadActivityEmptyState({
        itemCount: 0,
        loadFailed: false,
        loading: false,
      })
    ).toEqual({
      description:
        "Upload something to keep track of progress, ingestion, and any failures in one place.",
      title: "No activity yet",
    });

    expect(
      getUploadActivityEmptyState({
        itemCount: 2,
        loadFailed: false,
        loading: false,
      })
    ).toBeNull();
  });

  it("resolves safe upload activity error messages from runtime failures", () => {
    expect(
      resolveUploadActivityErrorMessage(new Error("Recent uploads timed out."))
    ).toBe("Recent uploads timed out.");
    expect(resolveUploadActivityErrorMessage("boom")).toBe(
      "Unable to load upload activity."
    );
  });

  it("keeps the recent-jobs loader wired to the route-provided safe error text on non-ok responses", () => {
    expect(uploadActivityHookSource).toContain(
      'throw new Error(payload.error?.trim() || "Unable to load upload activity.");'
    );
  });

  it("only enables upload activity live queries when the files route needs them", () => {
    expect(
      shouldEnableUploadActivityLiveQueries({
        activeWorkspaceUuid: "workspace-1",
        isFilesRoute: true,
        queueLength: 0,
        uploadActivityOpen: false,
      })
    ).toBe(false);

    expect(
      shouldEnableUploadActivityLiveQueries({
        activeWorkspaceUuid: "workspace-1",
        isFilesRoute: true,
        queueLength: 1,
        uploadActivityOpen: false,
      })
    ).toBe(true);

    expect(
      shouldEnableUploadActivityLiveQueries({
        activeWorkspaceUuid: "workspace-1",
        isFilesRoute: true,
        queueLength: 0,
        uploadActivityOpen: true,
      })
    ).toBe(true);

    expect(
      shouldEnableUploadActivityLiveQueries({
        activeWorkspaceUuid: "workspace-1",
        isFilesRoute: false,
        queueLength: 2,
        uploadActivityOpen: true,
      })
    ).toBe(false);
  });
});
