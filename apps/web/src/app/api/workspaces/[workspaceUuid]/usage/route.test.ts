import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getIngestionFlagsByFileIdsMock,
  getSessionUserMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
  listWorkspaceMembersMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getIngestionFlagsByFileIdsMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  listWorkspaceMembersMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getIngestionFlagsByFileIds: getIngestionFlagsByFileIdsMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  listWorkspaceMembers: listWorkspaceMembersMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/usage route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getIngestionFlagsByFileIdsMock.mockReset();
    getSessionUserMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    listWorkspaceMembersMock.mockReset();

    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("fails closed when top-level session or access lookup throws before usage loading begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("usage auth offline"));

    let response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "usage auth offline",
    });
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceMembersMock).not.toHaveBeenCalled();

    getSessionUserMock.mockResolvedValueOnce({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("usage access offline")
    );

    response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "usage access offline",
    });
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceMembersMock).not.toHaveBeenCalled();
  });

  it("returns usage counts derived from workspace resources", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "folder-1" },
      { id: "folder-2" },
    ]);
    listWorkspaceFilesMock.mockResolvedValue([
      { id: "file-1", sizeBytes: 10 },
      { id: "file-2", sizeBytes: 25 },
    ]);
    listWorkspaceMembersMock.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
      { userId: "user-3" },
    ]);
    getIngestionFlagsByFileIdsMock.mockResolvedValue({ "file-1": true });

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      usage: {
        fileCount: 2,
        folderCount: 2,
        indexedFileCount: 1,
        memberCount: 3,
        pendingIngestionCount: 1,
        totalSizeBytes: 35,
      },
    });
    expect(getIngestionFlagsByFileIdsMock).toHaveBeenCalledWith("workspace-1", [
      "file-1",
      "file-2",
    ]);
  });

  it("returns a 500 json error when workspace usage loading throws before ingestion flags are queried", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspaceFoldersMock.mockRejectedValueOnce(new Error("usage offline"));
    listWorkspaceFilesMock.mockResolvedValue([]);
    listWorkspaceMembersMock.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/usage"),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "usage offline",
    });
    expect(getIngestionFlagsByFileIdsMock).not.toHaveBeenCalled();
  });
});
