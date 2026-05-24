import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canStoreBytesMock,
  cookiesMock,
  createWorkspaceNoteFileMock,
  deleteWorkspaceForUserMock,
  extractLinkPreviewMock,
  getSessionUserMock,
  isSharedFilesVirtualFolderIdMock,
  listWorkspacesForUserMock,
  publishFilesInvalidationEventMock,
  publishWorkspaceStreamEventMock,
  scheduleIngestionJobMock,
  updateWorkspaceLogoForUserMock,
  userCanEditFolderMock,
  validateSudoCookieMock,
} = vi.hoisted(() => ({
  canStoreBytesMock: vi.fn(),
  cookiesMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  deleteWorkspaceForUserMock: vi.fn(),
  extractLinkPreviewMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  updateWorkspaceLogoForUserMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
  validateSudoCookieMock: vi.fn(),
}));

vi.mock("@avenire/ingestion/link", () => ({
  extractLinkPreview: extractLinkPreviewMock,
}));

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@/lib/billing", () => ({
  canStoreBytes: canStoreBytesMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  deleteWorkspaceForUser: deleteWorkspaceForUserMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  updateWorkspaceLogoForUser: updateWorkspaceLogoForUserMock,
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

vi.mock("@/lib/sudo", () => ({
  SUDO_COOKIE_NAME: "avenire_sudo",
  validateSudoCookie: validateSudoCookieMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { DELETE, PATCH } from "./route";

async function importWorkspaceLinksRoute() {
  return import("./links/route");
}

describe("/api/workspaces/[workspaceUuid] route", () => {
  beforeEach(() => {
    canStoreBytesMock.mockReset();
    cookiesMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    deleteWorkspaceForUserMock.mockReset();
    extractLinkPreviewMock.mockReset();
    getSessionUserMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    scheduleIngestionJobMock.mockReset();
    updateWorkspaceLogoForUserMock.mockReset();
    userCanEditFolderMock.mockReset();
    validateSudoCookieMock.mockReset();

    canStoreBytesMock.mockResolvedValue({ ok: true });
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "sudo-cookie" }),
    });
    createWorkspaceNoteFileMock.mockResolvedValue({ id: "file-1" });
    extractLinkPreviewMock.mockResolvedValue({
      favicon: null,
      title: "Example title",
    });
    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    listWorkspacesForUserMock.mockResolvedValue([{ id: "workspace-2" }]);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
    publishWorkspaceStreamEventMock.mockResolvedValue(undefined);
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-1" });
    validateSudoCookieMock.mockReturnValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    let response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });

    response = await PATCH(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "PATCH",
        body: JSON.stringify({ logo: "https://logo.example/x.png" }),
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it.each([
    {
      body: undefined,
      method: "DELETE" as const,
    },
    {
      body: { logo: "https://logo.example/x.png" },
      method: "PATCH" as const,
    },
  ])("fails closed from $method when session lookup throws before workspace route handling begins", async ({
    body,
    method,
  }) => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("workspace route auth offline")
    );

    const response =
      method === "DELETE"
        ? await DELETE(
            new Request("http://localhost:3003/api/workspaces/workspace-1", {
              method: "DELETE",
            }),
            { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
          )
        : await PATCH(
            new Request("http://localhost:3003/api/workspaces/workspace-1", {
              method: "PATCH",
              body: JSON.stringify(body),
            }),
            { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
          );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace route auth offline",
    });
    expect(cookiesMock).not.toHaveBeenCalled();
    expect(deleteWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(updateWorkspaceLogoForUserMock).not.toHaveBeenCalled();
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
  });

  it("requires a valid sudo cookie for workspace deletion", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    validateSudoCookieMock.mockReturnValue(false);

    const response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Sudo verification required",
    });
  });

  it("maps delete failure states to stable responses", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    deleteWorkspaceForUserMock.mockResolvedValueOnce({
      status: "workspace-not-found",
    });
    let response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });

    deleteWorkspaceForUserMock.mockResolvedValueOnce({ status: "forbidden" });
    response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });

    deleteWorkspaceForUserMock.mockResolvedValueOnce({ status: "not-owner" });
    response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only owners can delete workspaces",
    });
  });

  it("deletes the workspace and returns refreshed workspaces", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    deleteWorkspaceForUserMock.mockResolvedValue({ status: "deleted" });

    const response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      workspaces: [{ id: "workspace-2" }],
    });
  });

  it("returns a 500 json error when workspace deletion throws before refreshed workspaces load", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    deleteWorkspaceForUserMock.mockRejectedValueOnce(
      new Error("workspace delete offline")
    );

    const response = await DELETE(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace delete offline",
    });
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
  });

  it("maps patch failures and normalizes empty logos to null", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    updateWorkspaceLogoForUserMock.mockResolvedValueOnce({
      status: "workspace-not-found",
    });

    let response = await PATCH(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "PATCH",
        body: JSON.stringify({ logo: "  https://logo.example/x.png  " }),
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(updateWorkspaceLogoForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "https://logo.example/x.png"
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });

    updateWorkspaceLogoForUserMock.mockResolvedValueOnce({
      status: "forbidden",
    });
    response = await PATCH(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "PATCH",
        body: JSON.stringify({ logo: "   " }),
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(updateWorkspaceLogoForUserMock).toHaveBeenLastCalledWith(
      "user-1",
      "workspace-1",
      null
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("updates the workspace logo and returns refreshed workspaces", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    updateWorkspaceLogoForUserMock.mockResolvedValue({ status: "updated" });

    const response = await PATCH(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "PATCH",
        body: JSON.stringify({ logo: "https://logo.example/x.png" }),
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      workspaces: [{ id: "workspace-2" }],
    });
  });

  it("returns a 500 json error when workspace logo update throws before refreshed workspaces load", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    updateWorkspaceLogoForUserMock.mockRejectedValueOnce(
      new Error("workspace patch offline")
    );

    const response = await PATCH(
      new Request("http://localhost:3003/api/workspaces/workspace-1", {
        method: "PATCH",
        body: JSON.stringify({ logo: "https://logo.example/x.png" }),
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace patch offline",
    });
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace links session lookup throws before route handling begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("workspace links auth offline")
    );
    const { POST } = await importWorkspaceLinksRoute();

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/links", {
        body: JSON.stringify({
          folderId: "folder-1",
          url: "https://example.com/resource",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace links auth offline",
    });
    expect(extractLinkPreviewMock).not.toHaveBeenCalled();
    expect(createWorkspaceNoteFileMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace link creation throws after the wrapper delegates", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    extractLinkPreviewMock.mockRejectedValueOnce(
      new Error("workspace links preview offline")
    );
    const { POST } = await importWorkspaceLinksRoute();

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/links", {
        body: JSON.stringify({
          folderId: "folder-1",
          url: "https://example.com/resource",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace links preview offline",
    });
    expect(createWorkspaceNoteFileMock).not.toHaveBeenCalled();
    expect(scheduleIngestionJobMock).not.toHaveBeenCalled();
  });

  it("creates workspace link notes with explicit file-created invalidation payloads", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const { POST } = await importWorkspaceLinksRoute();

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/workspace-1/links", {
        body: JSON.stringify({
          folderId: "folder-1",
          name: "Saved Link",
          url: "https://example.com/resource",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      file: { id: "file-1" },
      ingestionJob: { id: "job-1" },
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: "file-1",
      folderId: "folder-1",
      reason: "file.created",
      workspaceUuid: "workspace-1",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: "workspace-1",
    });
  });
});
