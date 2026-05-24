import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteIngestionDataForFileMock,
  getFileAssetByIdMock,
  getSessionUserMock,
  publishFilesInvalidationEventMock,
  publishWorkspaceStreamEventMock,
  scheduleIngestionJobMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  deleteIngestionDataForFileMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  deleteIngestionDataForFile: deleteIngestionDataForFileMock,
}));

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { POST } from "./route";

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid]/reingest route", () => {
  beforeEach(() => {
    deleteIngestionDataForFileMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getSessionUserMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    scheduleIngestionJobMock.mockReset();
    userCanEditFileMock.mockReset();

    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
    publishWorkspaceStreamEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before reingest handling begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("reingest auth offline")
    );

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "reingest auth offline",
    });
    expect(userCanEditFileMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(deleteIngestionDataForFileMock).not.toHaveBeenCalled();
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
  });

  it("returns read-only file when the user cannot edit the file", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(false);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Read-only file" });
  });

  it("returns not found when the file record is missing", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "File not found" });
  });

  it("queues reingest work without a separate upload-credit gate", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
    });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-0" });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      job: { id: "job-0" },
    });
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      "workspace-1",
      "file-1"
    );
  });

  it("queues a reingest job and publishes realtime side effects", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
    });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-1" });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ job: { id: "job-1" } });
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      "workspace-1",
      "file-1"
    );
    expect(scheduleIngestionJobMock).toHaveBeenCalledWith({
      fileId: "file-1",
      sourceType: "manual.reingest",
      workspaceId: "workspace-1",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      folderId: "folder-1",
      reason: "file.updated",
      workspaceUuid: "workspace-1",
    });
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceUuid: "workspace-1",
        type: "ingestion.job",
        payload: expect.objectContaining({
          eventType: "job.queued",
          jobId: "job-1",
          workspaceId: "workspace-1",
        }),
      })
    );
  });

  it("still succeeds when realtime side effects reject", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({ folderId: null, id: "file-1" });
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-2" });
    publishFilesInvalidationEventMock.mockRejectedValueOnce(new Error("boom"));
    publishWorkspaceStreamEventMock.mockRejectedValueOnce(new Error("boom"));

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ job: { id: "job-2" } });
  });

  it("fails closed with an explicit reingest error when file reingest runtime throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockRejectedValue(new Error("reingest offline"));

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/reingest",
        { method: "POST" }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "reingest offline",
    });
    expect(deleteIngestionDataForFileMock).not.toHaveBeenCalled();
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });
});
