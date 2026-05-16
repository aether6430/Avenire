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

    invalidateTaskListCacheMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
    recomputeConceptMasteryMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/capture", {
        method: "POST",
        body: JSON.stringify({ kind: "task" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid capture kinds", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/capture", {
        method: "POST",
        body: JSON.stringify({ kind: "nope" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid capture kind",
    });
  });

  it("creates tasks with normalized defaults and invalidates task caches", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createTaskForUserMock.mockResolvedValue({ id: "task-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/capture", {
        method: "POST",
        body: JSON.stringify({
          kind: "task",
          title: "  Finish docs  ",
          description: "  ship it  ",
          dueAt: "2026-05-20T12:00:00.000Z",
          resources: [
            {
              href: "/workspace/files/res-1",
              resourceId: "res-1",
              resourceType: "file",
              subtitle: null,
              title: "Resource",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      kind: "task",
      task: { id: "task-1" },
    });
    expect(createTaskForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      {
        assigneeUserId: "user-1",
        description: "ship it",
        dueAt: new Date("2026-05-20T12:00:00.000Z"),
        resources: [
          {
            href: "/workspace/files/res-1",
            resourceId: "res-1",
            resourceType: "file",
            subtitle: null,
            title: "Resource",
          },
        ],
        title: "Finish docs",
      }
    );
    expect(invalidateTaskListCacheMock).toHaveBeenCalledWith("workspace-1");
  });

  it("creates quick-capture notes under the ensured notes folder and publishes invalidation events", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });
    ensureNotesFolderMock.mockResolvedValue({ id: "notes-folder-1" });
    createWorkspaceNoteFileMock.mockResolvedValue({ id: "note-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/capture", {
        method: "POST",
        body: JSON.stringify({
          kind: "note",
          title: "  Note title  ",
          content: "  keep this idea  ",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      kind: "note",
      note: { id: "note-1" },
    });
    expect(ensureNotesFolderMock).toHaveBeenCalledWith({
      rootFolderId: "root-1",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(createWorkspaceNoteFileMock).toHaveBeenCalledWith({
      content: "# Note title\n\nkeep this idea\n",
      folderId: "notes-folder-1",
      metadata: { quickCapture: true, type: "note" },
      name: "Note title",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
  });

  it("creates misconceptions with normalized payloads and recomputes concept mastery", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    upsertMisconceptionMock.mockResolvedValue({ id: "mis-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/capture", {
        method: "POST",
        body: JSON.stringify({
          kind: "misconception",
          subject: "  JavaScript  ",
          topic: "  Functions  ",
          concept: "  Closures  ",
          reason: "  mixed up scope  ",
          confidence: "wat",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      kind: "misconception",
      misconception: { id: "mis-1" },
    });
    expect(upsertMisconceptionMock).toHaveBeenCalledWith({
      confidence: 0.85,
      concept: "Closures",
      evidenceClass: "manual",
      reason: "mixed up scope",
      source: "manual",
      sourceSessionId: null,
      status: "confirmed",
      subject: "JavaScript",
      topic: "Functions",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(recomputeConceptMasteryMock).toHaveBeenCalledWith({
      concept: "Closures",
      subject: "JavaScript",
      topic: "Functions",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });
});
