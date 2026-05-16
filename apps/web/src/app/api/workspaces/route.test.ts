import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createOrganizationMock,
  getSessionUserMock,
  getWorkspaceContextForUserMock,
  headersMock,
  listWorkspacesForUserMock,
  randomUUIDMock,
  resolveWorkspaceForUserMock,
} = vi.hoisted(() => ({
  createOrganizationMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  headersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  randomUUIDMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock,
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      createOrganization: createOrganizationMock,
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

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { GET, POST } from "./route";

describe("GET /api/workspaces", () => {
  beforeEach(() => {
    createOrganizationMock.mockReset();
    getSessionUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    headersMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    randomUUIDMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    headersMock.mockResolvedValue(new Headers());
    randomUUIDMock.mockReturnValue("12345678-aaaa-bbbb-cccc-ddddeeeeffff");
  });

  it("returns unauthorized when there is no workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns the active workspace identifiers for the session", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: {
        workspaceId: "workspace-1",
        organizationId: "org-1",
        rootFolderId: "root-1",
      },
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      workspaceUuid: "workspace-1",
      organizationId: "org-1",
      rootFolderUuid: "root-1",
    });
  });
});

describe("POST /api/workspaces", () => {
  beforeEach(() => {
    createOrganizationMock.mockReset();
    getSessionUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    headersMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    randomUUIDMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    headersMock.mockResolvedValue(new Headers());
    randomUUIDMock.mockReturnValue("12345678-aaaa-bbbb-cccc-ddddeeeeffff");
  });

  it("returns unauthorized when the user is missing", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Physics Lab" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("reuses an existing workspace with the same trimmed name", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspacesForUserMock.mockResolvedValue([
      {
        organizationId: "org-1",
        logo: "logo.png",
        name: "Physics Lab",
      },
    ]);
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
      organizationId: "org-1",
      rootFolderId: "root-1",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "  physics lab  " }),
      })
    );

    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      workspace: {
        workspaceId: "workspace-1",
        organizationId: "org-1",
        rootFolderId: "root-1",
        logo: "logo.png",
        name: "Physics Lab",
      },
    });
  });

  it("creates a workspace and returns it when no matching workspace exists", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspacesForUserMock.mockResolvedValue([]);
    createOrganizationMock.mockResolvedValue({ id: "org-2" });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-2",
      organizationId: "org-2",
      rootFolderId: "root-2",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "  New Physics Lab  " }),
      })
    );

    expect(createOrganizationMock).toHaveBeenCalledWith({
      body: {
        keepCurrentActiveOrganization: false,
        name: "New Physics Lab",
        slug: "new-physics-lab-12345678",
        userId: "user-1",
      },
      headers: expect.any(Headers),
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      workspace: {
        workspaceId: "workspace-2",
        organizationId: "org-2",
        rootFolderId: "root-2",
        logo: null,
        name: "New Physics Lab",
      },
    });
  });
});
