import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFolderMock,
  getSessionUserMock,
  invalidateWorkspaceReadCachesMock,
  isSharedFilesVirtualFolderIdMock,
  publishFilesInvalidationEventMock,
  userCanAccessWorkspaceMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  createFolderMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  userCanAccessWorkspaceMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  createFolder: createFolderMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  userCanAccessWorkspace: userCanAccessWorkspaceMock,
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

describe("/api/workspaces/[workspaceUuid]/folders route", () => {
  beforeEach(() => {
    createFolderMock.mockReset();
    getSessionUserMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    userCanAccessWorkspaceMock.mockReset();
    userCanEditFolderMock.mockReset();

    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({ parentId: null, name: "Notes" }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns invalid payload for missing or blank create input", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    let response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({ name: "Notes" }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );
    expect(response.status).toBe(400);

    response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({ parentId: null, name: "   " }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing parentId or name",
    });
  });

  it("rejects creating items inside Shared Files with normalized ids", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    isSharedFilesVirtualFolderIdMock.mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: "  shared-files-folder  ",
          name: "Notes",
        }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "  workspace-1  " }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot create items in Shared Files",
    });
    expect(isSharedFilesVirtualFolderIdMock).toHaveBeenCalledWith(
      "shared-files-folder",
      "workspace-1"
    );
  });

  it("returns read-only folder when the user cannot edit the parent folder", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFolderMock.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: "  parent-1  ",
          name: "Notes",
        }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "  workspace-1  " }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Read-only folder",
    });
    expect(userCanEditFolderMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      folderId: "parent-1",
      userId: "user-1",
    });
  });

  it("returns read-only folder when the user cannot access the workspace root", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanAccessWorkspaceMock.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: "   ",
          name: "Root Notes",
        }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "  workspace-1  " }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Read-only folder",
    });
    expect(userCanAccessWorkspaceMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1"
    );
    expect(userCanEditFolderMock).not.toHaveBeenCalled();
  });

  it("returns unable to create folder when persistence fails", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    createFolderMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: null,
          name: "Notes",
        }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to create folder",
    });
  });

  it("creates folders, publishes invalidation events, and clears read caches", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFolderMock.mockResolvedValue(true);
    createFolderMock.mockResolvedValue({
      id: "folder-1",
      name: "Lecture Notes",
      parentId: "parent-1",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/folders", {
        method: "POST",
        body: JSON.stringify({
          parentId: "  parent-1  ",
          name: "  Lecture Notes  ",
        }),
      }),
      {
        params: Promise.resolve({ workspaceUuid: "  workspace-1  " }),
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      folder: {
        id: "folder-1",
        name: "Lecture Notes",
        parentId: "parent-1",
      },
    });
    expect(createFolderMock).toHaveBeenCalledWith(
      "workspace-1",
      "parent-1",
      "Lecture Notes",
      "user-1"
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      workspaceUuid: "workspace-1",
      folderId: "parent-1",
      reason: "folder.created",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      workspaceUuid: "workspace-1",
      reason: "tree.changed",
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });
});
