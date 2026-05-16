import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getUploadSessionMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getUploadSessionMock: vi.fn(),
}));

vi.mock("@/lib/upload-session-store", () => ({
  getUploadSession: getUploadSessionMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/uploads/sessions/[sessionId] route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    getUploadSessionMock.mockReset();
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/uploads/sessions/session-1"),
      {
        params: Promise.resolve({ sessionId: "session-1" }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns not found when the session does not exist", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/uploads/sessions/session-1"),
      {
        params: Promise.resolve({ sessionId: "session-1" }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Session not found",
    });
  });

  it("returns forbidden when the session belongs to another user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue({
      id: "session-1",
      userId: "other-user",
    });

    const response = await GET(
      new Request("http://localhost:3003/api/uploads/sessions/session-1"),
      {
        params: Promise.resolve({ sessionId: "session-1" }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns the session when the signed-in user owns it", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      workspaceUuid: "workspace-1",
      folderId: "folder-1",
      name: "lecture.mp4",
    });

    const response = await GET(
      new Request("http://localhost:3003/api/uploads/sessions/session-1"),
      {
        params: Promise.resolve({ sessionId: "session-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: {
        id: "session-1",
        userId: "user-1",
        workspaceUuid: "workspace-1",
        folderId: "folder-1",
        name: "lecture.mp4",
      },
    });
  });
});
