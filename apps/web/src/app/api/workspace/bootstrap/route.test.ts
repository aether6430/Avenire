import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  headersMock,
  listWorkspacesForUserMock,
  resolveWorkspaceForUserMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacesForUser: listWorkspacesForUserMock,
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

import { GET } from "./route";

describe("GET /api/workspace/bootstrap", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    headersMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns unauthorized when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns the signed-in user with the active workspace summary", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: null,
        name: "Dev User",
      },
      session: {
        activeOrganizationId: "org-1",
      },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
      organizationId: "org-1",
      rootFolderId: "root-1",
    });
    listWorkspacesForUserMock.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        logo: "logo.png",
        name: "Physics Lab",
      },
    ]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: null,
        name: "Dev User",
      },
      workspace: {
        workspaceId: "workspace-1",
        organizationId: "org-1",
        rootFolderId: "root-1",
        logo: "logo.png",
        name: "Physics Lab",
      },
      workspaces: [
        {
          workspaceId: "workspace-1",
          logo: "logo.png",
          name: "Physics Lab",
        },
      ],
    });
  });

  it("falls back to a generic workspace label when no summary is found", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: "avatar.png",
        name: null,
      },
      session: {
        activeOrganizationId: null,
      },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-2",
      organizationId: "org-2",
      rootFolderId: "root-2",
    });
    listWorkspacesForUserMock.mockResolvedValue([]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: "avatar.png",
        name: null,
      },
      workspace: {
        workspaceId: "workspace-2",
        organizationId: "org-2",
        rootFolderId: "root-2",
        logo: null,
        name: "Workspace",
      },
      workspaces: [],
    });
  });
});
