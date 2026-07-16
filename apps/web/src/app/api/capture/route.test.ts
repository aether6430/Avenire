import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createTaskForUserMock,
  createWorkspaceNoteFileMock,
  ensureNotesFolderMock,
  getWorkspaceContextForUserMock,
  invalidateTaskListCacheMock,
  publishFilesInvalidationEventMock,
  recomputeConceptMasteryMock,
  upsertMisconceptionMock,
} = vi.hoisted(() => ({
  createTaskForUserMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  ensureNotesFolderMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateTaskListCacheMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
  upsertMisconceptionMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  recomputeConceptMastery: recomputeConceptMasteryMock,
}));

vi.mock("@avenire/database/task-data", () => ({
  createTaskForUser: createTaskForUserMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/learning-data", () => ({
  upsertMisconception: upsertMisconceptionMock,
}));

vi.mock("@/lib/quick-capture", () => ({
  ensureNotesFolder: ensureNotesFolderMock,
}));

vi.mock("@/lib/tasks-cache", () => ({
  invalidateTaskListCache: invalidateTaskListCacheMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { rootFolderId: "root-1", workspaceId: "workspace-1" },
};

const postCapture = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/capture", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/capture route", () => {
  beforeEach(() => {
    createTaskForUserMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    ensureNotesFolderMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateTaskListCacheMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
    upsertMisconceptionMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects malformed quick-capture resources before creating a task", async () => {
    const response = await postCapture({
      kind: "task",
      resources: [{ href: "/files/file-1", resourceType: "file" }],
      title: "Review file",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
    });
    expect(createTaskForUserMock).not.toHaveBeenCalled();
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });

  it("returns the stable validation error for malformed JSON", async () => {
    const response = await POST(new Request("http://localhost:3003/api/capture", {
      body: "{",
      method: "POST",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request" });
    expect(createTaskForUserMock).not.toHaveBeenCalled();
  });
});
