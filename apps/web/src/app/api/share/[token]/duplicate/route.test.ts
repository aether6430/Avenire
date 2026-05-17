import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canUserAccessSharedResourceMock,
  duplicateSharedFileIntoWorkspaceMock,
  duplicateSharedFolderIntoWorkspaceMock,
  getSessionUserMock,
  listWorkspacesForUserMock,
  resolveResourceShareLinkMock,
} = vi.hoisted(() => ({
  canUserAccessSharedResourceMock: vi.fn(),
  duplicateSharedFileIntoWorkspaceMock: vi.fn(),
  duplicateSharedFolderIntoWorkspaceMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  resolveResourceShareLinkMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  canUserAccessSharedResource: canUserAccessSharedResourceMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  resolveResourceShareLink: resolveResourceShareLinkMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("./shared-resource-duplicate-file", () => ({
  duplicateSharedFileIntoWorkspace: duplicateSharedFileIntoWorkspaceMock,
}));

vi.mock("./shared-resource-duplicate-folder", () => ({
  duplicateSharedFolderIntoWorkspace: duplicateSharedFolderIntoWorkspaceMock,
}));

import { POST } from "./route";

describe("shared resource duplicate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
    });
    resolveResourceShareLinkMock.mockResolvedValue({
      resourceId: "resource-1",
      resourceType: "file",
      workspaceId: "workspace-source",
    });
    canUserAccessSharedResourceMock.mockResolvedValue(true);
    listWorkspacesForUserMock.mockResolvedValue([
      {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);
    duplicateSharedFileIntoWorkspaceMock.mockResolvedValue(
      Response.json({
        copied: true,
        route: "/workspace/files/workspace-1/folder/root-1?file=file-copy",
      })
    );
    duplicateSharedFolderIntoWorkspaceMock.mockResolvedValue(
      Response.json({
        copied: true,
        route: "/workspace/files/workspace-1/folder/folder-copy",
      })
    );
  });

  it("fails closed for unauthorized, missing, forbidden, unsupported, invalid, and unknown-workspace requests", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const unauthorized = await POST(new Request("https://avenire.app"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(unauthorized.status).toBe(401);

    resolveResourceShareLinkMock.mockResolvedValueOnce(null);
    const missing = await POST(new Request("https://avenire.app"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(missing.status).toBe(404);

    canUserAccessSharedResourceMock.mockResolvedValueOnce(false);
    const forbidden = await POST(new Request("https://avenire.app"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(forbidden.status).toBe(403);

    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "resource-1",
      resourceType: "workspace",
      workspaceId: "workspace-source",
    });
    const unsupported = await POST(new Request("https://avenire.app"), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toEqual({
      error: "Only files and folders can be copied.",
    });

    const invalidPayload = await POST(
      new Request("https://avenire.app", {
        body: JSON.stringify({ workspaceId: "" }),
        method: "POST",
      }),
      {
        params: Promise.resolve({ token: "token-1" }),
      }
    );
    expect(invalidPayload.status).toBe(400);

    listWorkspacesForUserMock.mockResolvedValueOnce([]);
    const unknownWorkspace = await POST(
      new Request("https://avenire.app", {
        body: JSON.stringify({ workspaceId: "workspace-1" }),
        method: "POST",
      }),
      {
        params: Promise.resolve({ token: "token-1" }),
      }
    );
    expect(unknownWorkspace.status).toBe(404);
  });

  it("duplicates shared files into the selected workspace with the built destination route", async () => {
    const response = await POST(
      new Request("https://avenire.app", {
        body: JSON.stringify({ workspaceId: "workspace-1" }),
        method: "POST",
      }),
      {
        params: Promise.resolve({ token: "token-1" }),
      }
    );

    expect(duplicateSharedFileIntoWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "resource-1",
        sourceWorkspaceId: "workspace-source",
        targetFolderId: "root-1",
        targetWorkspaceId: "workspace-1",
        userId: "user-1",
      })
    );
    const buildRoute = duplicateSharedFileIntoWorkspaceMock.mock.calls[0]?.[0]
      ?.buildRoute as (input: { fileId: string; folderId: string }) => string;
    expect(
      buildRoute({
        fileId: "file-copy",
        folderId: "folder-copy",
      })
    ).toBe("/workspace/files/workspace-1/folder/folder-copy?file=file-copy");
    expect(response.status).toBe(200);
  });

  it("duplicates shared folders into the selected workspace with the built destination route", async () => {
    resolveResourceShareLinkMock.mockResolvedValueOnce({
      resourceId: "folder-source",
      resourceType: "folder",
      workspaceId: "workspace-source",
    });

    const response = await POST(
      new Request("https://avenire.app", {
        body: JSON.stringify({ workspaceId: "workspace-1" }),
        method: "POST",
      }),
      {
        params: Promise.resolve({ token: "token-1" }),
      }
    );

    expect(duplicateSharedFolderIntoWorkspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-source",
        sourceWorkspaceId: "workspace-source",
        targetRootFolderId: "root-1",
        targetWorkspaceId: "workspace-1",
        userId: "user-1",
      })
    );
    const buildRoute = duplicateSharedFolderIntoWorkspaceMock.mock.calls[0]?.[0]
      ?.buildRoute as (folderId: string) => string;
    expect(buildRoute("folder-copy")).toBe(
      "/workspace/files/workspace-1/folder/folder-copy"
    );
    expect(response.status).toBe(200);
  });
});
