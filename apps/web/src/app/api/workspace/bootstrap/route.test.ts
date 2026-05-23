import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const workspaceBootstrapRouteFile = resolve(import.meta.dirname, "./route.ts");
const workspaceBootstrapRouteModelFile = resolve(
  import.meta.dirname,
  "./workspace-bootstrap-route-model.ts"
);

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

  it("fails closed when session lookup throws before workspace bootstrap loading begins", async () => {
    getSessionMock.mockRejectedValueOnce(new Error("bootstrap auth offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bootstrap auth offline",
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
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

  it("fails closed with an explicit bootstrap error when workspace loading throws", async () => {
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
    resolveWorkspaceForUserMock.mockRejectedValue(
      new Error("bootstrap offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bootstrap offline",
    });
    expect(listWorkspacesForUserMock).toHaveBeenCalledWith("user-1");
  });

  it("keeps workspace bootstrap fallback helpers in the dedicated route model file", () => {
    const routeSource = readFileSync(workspaceBootstrapRouteFile, "utf8");

    expect(routeSource).toContain('from "./workspace-bootstrap-route-model"');
    expect(routeSource).not.toContain(
      'const WORKSPACE_BOOTSTRAP_LOAD_ERROR = "Unable to load workspace bootstrap."'
    );
    expect(existsSync(workspaceBootstrapRouteModelFile)).toBe(true);
  });
});
