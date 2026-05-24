import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  listChatsForUserMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listChatsForUserMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  listChatsForUser: listChatsForUserMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/tasks/resources route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    listChatsForUserMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/tasks/resources"
      ),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("fails closed when top-level session or access lookup throws before resource loading begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("task resources auth offline")
    );

    let response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/tasks/resources"
      ),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "task resources auth offline",
    });
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
    expect(listChatsForUserMock).not.toHaveBeenCalled();

    getSessionUserMock.mockResolvedValueOnce({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("task resources access offline")
    );

    response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/tasks/resources"
      ),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "task resources access offline",
    });
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
    expect(listChatsForUserMock).not.toHaveBeenCalled();
  });

  it("returns filtered resource options from files, folders, and chats", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listWorkspaceFilesMock.mockResolvedValue([
      {
        folderId: "folder-1",
        id: "file-1",
        name: "Notes.md",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      {
        id: "folder-2",
        name: "Projects",
        parentId: "root",
      },
    ]);
    listChatsForUserMock.mockResolvedValue([
      {
        slug: "math-method",
        title: "Math Method",
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/tasks/resources?q=method"
      ),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      resources: [
        {
          href: "/workspace/chats/math-method",
          resourceId: "math-method",
          resourceType: "chat",
          subtitle: "Method",
          title: "Math Method",
        },
      ],
    });
  });

  it("returns a 500 json error when task resource loading throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listWorkspaceFilesMock.mockRejectedValueOnce(
      new Error("resources offline")
    );
    listWorkspaceFoldersMock.mockResolvedValue([]);
    listChatsForUserMock.mockResolvedValue([]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/tasks/resources?q=method"
      ),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "resources offline",
    });
  });
});
