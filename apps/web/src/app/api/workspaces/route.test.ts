import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const workspacesRouteFile = resolve(import.meta.dirname, "./route.ts");
const workspacesRouteModelFile = resolve(
  import.meta.dirname,
  "./workspaces-route-model.ts"
);

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

  it("fails closed with an explicit load error when workspace context resolution throws", async () => {
    getWorkspaceContextForUserMock.mockRejectedValue(
      new Error("workspace context offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace context offline",
    });
  });

  it("keeps route-level fallback helpers in the shared workspaces route model", () => {
    const routeSource = readFileSync(workspacesRouteFile, "utf8");

    expect(routeSource).toContain('from "./workspaces-route-model"');
    expect(routeSource).not.toContain(
      'const WORKSPACE_ROUTE_LOAD_ERROR = "Unable to load workspace."'
    );
    expect(routeSource).not.toContain(
      'const WORKSPACE_ROUTE_CREATE_ERROR = "Unable to create workspace."'
    );
    expect(existsSync(workspacesRouteModelFile)).toBe(true);
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

  it("fails closed when session lookup throws before workspace creation begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("workspaces auth offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Physics Lab" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspaces auth offline",
    });
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
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

  it("fails closed with an explicit create error when workspace creation lookups throw", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspacesForUserMock.mockRejectedValue(
      new Error("workspace write offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Physics Lab" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace write offline",
    });
    expect(createOrganizationMock).not.toHaveBeenCalled();
  });
});
