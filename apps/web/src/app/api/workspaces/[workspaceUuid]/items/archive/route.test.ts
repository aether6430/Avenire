import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  getFileAssetByIdMock,
  getFolderWithAncestorsMock,
  getNoteContentMock,
  headersMock,
  isMarkdownFileRecordMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
  userCanAccessWorkspaceMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  headersMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  userCanAccessWorkspaceMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  getNoteContent: getNoteContentMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  userCanAccessWorkspace: userCanAccessWorkspaceMock,
}));

import { POST } from "./route";

describe("/api/workspaces/[workspaceUuid]/items/archive route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getFolderWithAncestorsMock.mockReset();
    getNoteContentMock.mockReset();
    headersMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    userCanAccessWorkspaceMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before archive access checks begin", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("archive auth offline"));

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "archive auth offline",
    });
    expect(userCanAccessWorkspaceMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace access lookup throws before archive selection begins", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockRejectedValueOnce(
      new Error("archive access offline")
    );

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({ items: [{ id: "file-1", kind: "file" }] }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "archive access offline",
    });
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
  });

  it("returns invalid payload when no archiveable items are requested", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({ items: [{ id: "", kind: "file" }] }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("returns a direct markdown download when a single file is requested", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      name: "Notes.md",
      storageUrl: "https://cdn.example.com/notes.md",
      mimeType: "text/markdown",
    });
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({ content: "# Notes" });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({ id: "file-1", kind: "file" }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(response.headers.get("content-disposition")).toContain("Notes.md");
    await expect(response.text()).resolves.toBe("# Notes");
  });

  it("returns a 500 json error when single-file archive loading throws during payload fetch", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      name: "Binary.bin",
      storageUrl: "https://cdn.example.com/binary.bin",
      mimeType: "application/octet-stream",
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("boom", { status: 503 }));

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({ id: "file-1", kind: "file" }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to fetch file payload: 503",
    });
    fetchSpy.mockRestore();
  });

  it("returns a zipped folder archive with sanitized nested file paths", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { id: "folder-root" },
    });
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "folder-root", name: "Course/Notes", parentId: null },
      { id: "folder-child", name: "Week 1", parentId: "folder-root" },
    ]);
    listWorkspaceFilesMock.mockResolvedValue([
      { id: "file-root", folderId: "folder-root" },
      { id: "file-child", folderId: "folder-child" },
    ]);
    getFileAssetByIdMock.mockImplementation(
      async (_workspaceUuid: string, fileId: string) => {
        if (fileId === "file-root") {
          return {
            id: "file-root",
            name: "Intro?.md",
            storageUrl: "https://cdn.example.com/intro.md",
            mimeType: "text/markdown",
          };
        }

        if (fileId === "file-child") {
          return {
            id: "file-child",
            name: "Lecture:1.md",
            storageUrl: "https://cdn.example.com/lecture.md",
            mimeType: "text/markdown",
          };
        }

        return null;
      }
    );
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockImplementation(async (fileId: string) => {
      if (fileId === "file-root") {
        return { content: "Intro content" };
      }

      if (fileId === "file-child") {
        return { content: "Lecture content" };
      }

      return null;
    });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: "folder-root", kind: "folder" }],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");

    const archiveEntries = unzipSync(
      new Uint8Array(await response.arrayBuffer())
    );
    expect(Object.keys(archiveEntries).sort()).toEqual([
      "Course-Notes/Intro-.md",
      "Course-Notes/Week 1/Lecture-1.md",
    ]);
    expect(
      Buffer.from(archiveEntries["Course-Notes/Intro-.md"]!).toString("utf8")
    ).toBe("Intro content");
    expect(
      Buffer.from(archiveEntries["Course-Notes/Week 1/Lecture-1.md"]!).toString(
        "utf8"
      )
    ).toBe("Lecture content");
  });

  it("returns a 500 json error when folder archive selection throws before producing a zip", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    listWorkspaceFoldersMock.mockRejectedValueOnce(
      new Error("archive index offline")
    );
    listWorkspaceFilesMock.mockResolvedValue([]);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: "folder-root", kind: "folder" }],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "archive index offline",
    });
  });

  it("returns not found when asked to archive a missing folder", async () => {
    authGetSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    getFolderWithAncestorsMock.mockResolvedValue(null);
    listWorkspaceFoldersMock.mockResolvedValue([]);
    listWorkspaceFilesMock.mockResolvedValue([]);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/items/archive",
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: "folder-root", kind: "folder" }],
          }),
        }
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Folder not found",
    });
  });
});
