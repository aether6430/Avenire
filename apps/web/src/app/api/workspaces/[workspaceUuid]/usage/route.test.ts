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

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  listWorkspaceMembers: listWorkspaceMembersMock,
}));

vi.mock("@/lib/ingestion-data", () => ({
  getIngestionFlagsByFileIds: getIngestionFlagsByFileIdsMock,
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
});
