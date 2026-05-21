import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteIngestionDataForFileMock,
  getFileAssetByIdMock,
  getSessionUserMock,
  getWorkspaceIdForFileMock,
  invalidateWorkspaceReadCachesMock,
  isMarkdownFileRecordMock,
  publishFilesInvalidationEventMock,
  scheduleIngestionJobMock,
  updateFileAssetMock,
  upsertMarkdownFileContentMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  deleteIngestionDataForFileMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getWorkspaceIdForFileMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  updateFileAssetMock: vi.fn(),
  upsertMarkdownFileContentMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@/lib/file-data", () => ({
  deleteIngestionDataForFile: deleteIngestionDataForFileMock,
  getFileAssetById: getFileAssetByIdMock,
  getWorkspaceIdForFile: getWorkspaceIdForFileMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  updateFileAsset: updateFileAssetMock,
  upsertMarkdownFileContent: upsertMarkdownFileContentMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { PATCH } from "./route";

const NOTE_ID = "note-1";
const NOTE_ROUTE_URL = "http://localhost:3003";
const NOTE_ROUTE_PARAMS = {
  params: Promise.resolve({ noteId: NOTE_ID }),
};
const SESSION_USER = { id: "user-1" };
const NOTE_FILE_RECORD = {
  id: NOTE_ID,
  folderId: "folder-1",
  updatedAt: "2026-05-13T00:00:00.000Z",
};

function patchRequest(body: Record<string, unknown>) {
  return new Request(NOTE_ROUTE_URL, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function mockEditableMarkdownNote(page: Record<string, unknown> | null = null) {
  getSessionUserMock.mockResolvedValue(SESSION_USER);
  getWorkspaceIdForFileMock.mockResolvedValue("workspace-1");
  userCanEditFileMock.mockResolvedValue(true);
  getFileAssetByIdMock.mockResolvedValue({
    ...NOTE_FILE_RECORD,
    page,
  });
  isMarkdownFileRecordMock.mockReturnValue(true);
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe("PATCH /api/notes/[noteId]", () => {
  beforeEach(() => {
    deleteIngestionDataForFileMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getSessionUserMock.mockReset();
    getWorkspaceIdForFileMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    scheduleIngestionJobMock.mockReset();
    updateFileAssetMock.mockReset();
    upsertMarkdownFileContentMock.mockReset();
    userCanEditFileMock.mockReset();
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(
        await PATCH(patchRequest({ content: "# Hello" }), NOTE_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Unauthorized" },
      status: 401,
    });
  });

  it("returns not found when the note has no workspace mapping", async () => {
    getSessionUserMock.mockResolvedValue(SESSION_USER);
    getWorkspaceIdForFileMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(
        await PATCH(patchRequest({ content: "# Hello" }), NOTE_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Note not found" },
      status: 404,
    });
  });

  it("returns read-only note when the user cannot edit it", async () => {
    getSessionUserMock.mockResolvedValue(SESSION_USER);
    getWorkspaceIdForFileMock.mockResolvedValue("workspace-1");
    userCanEditFileMock.mockResolvedValue(false);

    await expect(
      readErrorResponse(
        await PATCH(patchRequest({ content: "# Hello" }), NOTE_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Read-only note" },
      status: 403,
    });
  });

  it("rejects non-markdown files", async () => {
    mockEditableMarkdownNote();
    isMarkdownFileRecordMock.mockReturnValue(false);

    await expect(
      readErrorResponse(
        await PATCH(patchRequest({ content: "# Hello" }), NOTE_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error: "Not a markdown file" },
      status: 400,
    });
  });

  it("rejects invalid note updates", async () => {
    mockEditableMarkdownNote();

    await expect(
      readErrorResponse(await PATCH(patchRequest({}), NOTE_ROUTE_PARAMS))
    ).resolves.toEqual({
      body: { error: "Invalid note update" },
      status: 400,
    });
  });

  it("saves markdown content, schedules reindexing, and avoids redundant metadata writes", async () => {
    mockEditableMarkdownNote({
      bannerUrl: null,
      icon: "note",
      properties: {},
    });
    upsertMarkdownFileContentMock.mockResolvedValue({
      updatedAt: "2026-05-13T00:10:00.000Z",
    });

    const response = await PATCH(
      patchRequest({ content: "# Fresh note" }),
      NOTE_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: {
        bannerUrl: null,
        icon: "note",
        properties: {},
      },
      updatedAt: "2026-05-13T00:10:00.000Z",
    });
    expect(upsertMarkdownFileContentMock).toHaveBeenCalledWith({
      fileId: "note-1",
      userId: "user-1",
      content: "# Fresh note",
      workspaceId: "workspace-1",
    });
    expect(updateFileAssetMock).not.toHaveBeenCalled();
    expect(scheduleIngestionJobMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      fileId: NOTE_ID,
      sourceType: "markdown",
      delayMs: 3000,
    });
    expect(deleteIngestionDataForFileMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      workspaceUuid: "workspace-1",
      folderId: "folder-1",
      fileId: "note-1",
      reason: "file.updated",
    });
  });

  it("deletes ingestion data when note content becomes empty", async () => {
    mockEditableMarkdownNote();
    upsertMarkdownFileContentMock.mockResolvedValue({
      updatedAt: "2026-05-13T00:11:00.000Z",
    });

    const response = await PATCH(
      patchRequest({ content: "   " }),
      NOTE_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      "workspace-1",
      NOTE_ID
    );
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
  });

  it("updates normalized page metadata without rewriting note content", async () => {
    mockEditableMarkdownNote({
      bannerUrl: "https://cdn.example.com/banner.png",
      icon: null,
      properties: {
        topic: {
          type: "text",
          value: "systems",
        },
      },
    });
    updateFileAssetMock.mockResolvedValue({
      page: {
        bannerUrl: "https://cdn.example.com/banner.png",
        icon: "spark",
        properties: {
          difficulty: {
            type: "text",
            value: "hard",
          },
        },
      },
      updatedAt: "2026-05-13T00:12:00.000Z",
    });

    const response = await PATCH(
      patchRequest({
        page: {
          icon: " spark ",
          properties: {
            Difficulty: {
              type: "text",
              value: " hard ",
            },
          },
        },
      }),
      NOTE_ROUTE_PARAMS
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: {
        bannerUrl: "https://cdn.example.com/banner.png",
        icon: "spark",
        properties: {
          difficulty: {
            type: "text",
            value: "hard",
          },
        },
      },
      updatedAt: "2026-05-13T00:12:00.000Z",
    });
    expect(updateFileAssetMock).toHaveBeenCalledWith(
      "workspace-1",
      "note-1",
      "user-1",
      {
        metadata: {
          page: {
            bannerUrl: "https://cdn.example.com/banner.png",
            icon: "spark",
            properties: {
              difficulty: {
                type: "text",
                value: "hard",
              },
            },
          },
        },
      }
    );
    expect(upsertMarkdownFileContentMock).not.toHaveBeenCalled();
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
    expect(deleteIngestionDataForFileMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });
});
