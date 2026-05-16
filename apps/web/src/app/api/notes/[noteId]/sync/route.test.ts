import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  deleteIngestionDataForFileMock,
  deleteUploadThingFileMock,
  getAccessibleMarkdownNoteForUserMock,
  getFileAssetByIdMock,
  getNoteContentMock,
  getSessionUserMock,
  getWorkspaceIdForFileMock,
  invalidateWorkspaceReadCachesMock,
  isMarkdownFileRecordMock,
  publishFilesInvalidationEventMock,
  scheduleIngestionJobMock,
  upsertMarkdownFileContentMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(async (callback: () => Promise<void> | void) => {
    await callback();
  }),
  deleteIngestionDataForFileMock: vi.fn(),
  deleteUploadThingFileMock: vi.fn(),
  getAccessibleMarkdownNoteForUserMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getWorkspaceIdForFileMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  upsertMarkdownFileContentMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  deleteIngestionDataForFile: deleteIngestionDataForFileMock,
  getAccessibleMarkdownNoteForUser: getAccessibleMarkdownNoteForUserMock,
  getFileAssetById: getFileAssetByIdMock,
  getNoteContent: getNoteContentMock,
  getWorkspaceIdForFile: getWorkspaceIdForFileMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  upsertMarkdownFileContent: upsertMarkdownFileContentMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  deleteUploadThingFile: deleteUploadThingFileMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET, POST } from "./route";

const NOTE_ID = "note-1";
const WORKSPACE_ID = "workspace-1";

function noteSyncRequest(
  method: "GET" | "POST",
  body?: Record<string, unknown>
) {
  return new Request("http://localhost:3003", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function noteSyncParams(noteId = NOTE_ID) {
  return { params: Promise.resolve({ noteId }) };
}

function mockSessionUser() {
  getSessionUserMock.mockResolvedValue({ id: "user-1" });
}

function mockAccessibleNote(
  overrides: {
    file?: Record<string, unknown>;
    note?: Record<string, unknown> | null;
    workspaceId?: string;
  } = {}
) {
  mockSessionUser();
  getAccessibleMarkdownNoteForUserMock.mockResolvedValue({
    file: {
      updatedAt: "2026-05-12T00:00:00.000Z",
      ...overrides.file,
    },
    note: overrides.note ?? null,
    workspaceId: overrides.workspaceId ?? WORKSPACE_ID,
  });
}

function mockEditableSyncNote(
  overrides: {
    file?: Record<string, unknown>;
    content?: string;
    version?: number;
    workspaceId?: string | null;
    markdown?: boolean;
  } = {}
) {
  mockSessionUser();
  getWorkspaceIdForFileMock.mockResolvedValue(
    overrides.workspaceId ?? WORKSPACE_ID
  );
  userCanEditFileMock.mockResolvedValue(true);
  getFileAssetByIdMock.mockResolvedValue({
    folderId: "folder-1",
    id: NOTE_ID,
    ...overrides.file,
  });
  isMarkdownFileRecordMock.mockReturnValue(overrides.markdown ?? true);
  if (overrides.content !== undefined || overrides.version !== undefined) {
    getNoteContentMock.mockResolvedValue({
      content: overrides.content ?? "",
      version: overrides.version ?? 0,
    });
  }
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

function resetNoteSyncMocks() {
  afterMock.mockClear();
  deleteIngestionDataForFileMock.mockReset();
  deleteUploadThingFileMock.mockReset();
  getAccessibleMarkdownNoteForUserMock.mockReset();
  getFileAssetByIdMock.mockReset();
  getNoteContentMock.mockReset();
  getSessionUserMock.mockReset();
  getWorkspaceIdForFileMock.mockReset();
  invalidateWorkspaceReadCachesMock.mockReset();
  isMarkdownFileRecordMock.mockReset();
  publishFilesInvalidationEventMock.mockReset();
  scheduleIngestionJobMock.mockReset();
  upsertMarkdownFileContentMock.mockReset();
  userCanEditFileMock.mockReset();
  vi.restoreAllMocks();
}

describe("GET /api/notes/[noteId]/sync", () => {
  beforeEach(() => {
    resetNoteSyncMocks();
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(await GET(noteSyncRequest("GET"), noteSyncParams()))
    ).resolves.toEqual({
      body: { error: "Unauthorized" },
      status: 401,
    });
  });

  it("returns not found when the note is not accessible", async () => {
    mockSessionUser();
    getAccessibleMarkdownNoteForUserMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(await GET(noteSyncRequest("GET"), noteSyncParams()))
    ).resolves.toEqual({
      body: { error: "Markdown file not found" },
      status: 404,
    });
  });

  it("returns stored markdown when the note content already exists", async () => {
    mockAccessibleNote({
      note: {
        content: "# Ready\n\nAlready synced.",
        updatedAt: new Date("2026-05-12T01:00:00.000Z"),
        version: 7,
      },
    });

    const response = await GET(noteSyncRequest("GET"), noteSyncParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markdown: "# Ready\n\nAlready synced.",
      updatedAt: "2026-05-12T01:00:00.000Z",
      version: 7,
    });
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("returns an empty fallback when storage fetch fails", async () => {
    mockAccessibleNote({
      file: {
        storageKey: "note-key",
        storageUrl: "https://storage.example.com/note.md",
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("missing", { status: 500 })
    );

    const response = await GET(noteSyncRequest("GET"), noteSyncParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markdown: "",
      updatedAt: "2026-05-12T00:00:00.000Z",
      version: 0,
    });
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("returns fetched markdown and migrates it into note storage", async () => {
    mockAccessibleNote({
      file: {
        storageKey: "new-key",
        storageUrl: "https://storage.example.com/note.md",
      },
    });
    userCanEditFileMock.mockResolvedValue(true);
    upsertMarkdownFileContentMock.mockResolvedValue({
      file: { storageKey: "new-key" },
      previousStorageKey: "old-key",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# Migrated\n\nHello from storage.", {
        status: 200,
      })
    );

    const response = await GET(noteSyncRequest("GET"), noteSyncParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      markdown: "# Migrated\n\nHello from storage.",
      updatedAt: "2026-05-12T00:00:00.000Z",
      version: 0,
    });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(userCanEditFileMock).toHaveBeenCalledWith({
      fileId: "note-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(upsertMarkdownFileContentMock).toHaveBeenCalledWith({
      content: "# Migrated\n\nHello from storage.",
      fileId: "note-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(deleteUploadThingFileMock).toHaveBeenCalledWith("old-key");
  });

  it("skips markdown migration when the user can no longer edit the file", async () => {
    mockAccessibleNote({
      file: {
        storageKey: "note-key",
        storageUrl: "https://storage.example.com/note.md",
      },
    });
    userCanEditFileMock.mockResolvedValue(false);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# Migrated", { status: 200 })
    );

    const response = await GET(
      noteSyncRequest("GET"),
      noteSyncParams("  note-1  ")
    );

    expect(response.status).toBe(200);
    expect(userCanEditFileMock).toHaveBeenCalledWith({
      fileId: "note-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(upsertMarkdownFileContentMock).not.toHaveBeenCalled();
    expect(deleteUploadThingFileMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/notes/[noteId]/sync", () => {
  beforeEach(() => {
    resetNoteSyncMocks();

    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it.each([
    {
      body: { base: "", current: "" },
      error: "Unauthorized",
      name: "returns unauthorized when there is no session user",
      prepare: () => {
        getSessionUserMock.mockResolvedValue(null);
      },
      status: 401,
    },
    {
      body: { base: "", current: "" },
      error: "Note not found",
      name: "returns not found when the note has no workspace mapping",
      prepare: () => {
        mockSessionUser();
        getWorkspaceIdForFileMock.mockResolvedValue(null);
      },
      status: 404,
    },
    {
      body: { base: "", current: "" },
      error: "Read-only note",
      name: "returns read-only note when the user cannot edit it",
      prepare: () => {
        mockSessionUser();
        getWorkspaceIdForFileMock.mockResolvedValue(WORKSPACE_ID);
        userCanEditFileMock.mockResolvedValue(false);
      },
      status: 403,
    },
    {
      body: { base: "", current: "" },
      error: "Markdown file not found",
      name: "returns not found when the file is missing",
      prepare: () => {
        mockEditableSyncNote({ markdown: true });
        getFileAssetByIdMock.mockResolvedValue(null);
      },
      status: 404,
    },
    {
      body: { base: "", current: "" },
      error: "Markdown file not found",
      name: "returns not found when the file is not markdown",
      prepare: () => {
        mockEditableSyncNote({ markdown: false });
      },
      status: 404,
    },
    {
      body: { base: "" },
      error: "Invalid sync payload",
      name: "rejects invalid sync payloads",
      prepare: () => {
        mockEditableSyncNote();
      },
      status: 400,
    },
  ])("$name", async ({ body, error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(
        await POST(noteSyncRequest("POST", body), noteSyncParams())
      )
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("merges note content, schedules reindexing, and invalidates readers", async () => {
    mockEditableSyncNote({ content: "alpha", version: 3 });
    upsertMarkdownFileContentMock.mockResolvedValue({
      updatedAt: new Date("2026-05-13T00:10:00.000Z"),
      version: 4,
    });

    const response = await POST(
      noteSyncRequest("POST", {
        base: "alpha",
        current: "alpha\nbeta",
      }),
      noteSyncParams("  note-1  ")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      hasConflict: false,
      merged: "alpha\nbeta",
      updatedAt: "2026-05-13T00:10:00.000Z",
      version: 4,
    });
    expect(getWorkspaceIdForFileMock).toHaveBeenCalledWith("note-1");
    expect(getNoteContentMock).toHaveBeenCalledWith("note-1");
    expect(upsertMarkdownFileContentMock).toHaveBeenCalledWith({
      content: "alpha\nbeta",
      fileId: "note-1",
      userId: "user-1",
      version: 4,
      workspaceId: "workspace-1",
    });
    expect(scheduleIngestionJobMock).toHaveBeenCalledWith({
      delayMs: 3000,
      fileId: "note-1",
      sourceType: "markdown",
      workspaceId: "workspace-1",
    });
    expect(deleteIngestionDataForFileMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      fileId: "note-1",
      folderId: "folder-1",
      reason: "file.updated",
      workspaceUuid: "workspace-1",
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });

  it("deletes ingestion data when merged content becomes empty", async () => {
    mockEditableSyncNote({ content: "", version: 0 });
    upsertMarkdownFileContentMock.mockResolvedValue({
      updatedAt: new Date("2026-05-13T00:11:00.000Z"),
      version: 1,
    });

    const response = await POST(
      noteSyncRequest("POST", {
        base: "",
        current: "   ",
      }),
      noteSyncParams()
    );

    expect(response.status).toBe(200);
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      "workspace-1",
      "note-1"
    );
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
  });

  it("returns 500 when sync persistence fails", async () => {
    mockEditableSyncNote({ content: "alpha", version: 2 });
    upsertMarkdownFileContentMock.mockResolvedValue(null);

    const response = await POST(
      noteSyncRequest("POST", {
        base: "alpha",
        current: "alpha\nbeta",
      }),
      noteSyncParams()
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to sync note",
    });
  });
});
