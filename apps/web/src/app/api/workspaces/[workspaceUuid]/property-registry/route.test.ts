import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  listWorkspacePropertyRegistryMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspacePropertyRegistryMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacePropertyRegistry: listWorkspacePropertyRegistryMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/property-registry route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    listWorkspacePropertyRegistryMock.mockReset();
  });

  it("returns unauthorized without a session user", async () => {
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

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns property definitions for an authorized workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listWorkspacePropertyRegistryMock.mockResolvedValue([{ key: "status" }]);

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ workspaceUuid: " workspace-1 " }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      properties: [{ key: "status" }],
    });
    expect(ensureWorkspaceAccessForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1"
    );
    expect(listWorkspacePropertyRegistryMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });

  it("maps registry loading failures to stable json", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    listWorkspacePropertyRegistryMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });

  it("returns a 500 json error when workspace support context lookup throws", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("support context offline")
    );

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "support context offline",
    });
    expect(listWorkspacePropertyRegistryMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when wrapper params resolution throws", async () => {
    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.reject(new Error("property registry params offline")),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "property registry params offline",
    });
    expect(getSessionUserMock).not.toHaveBeenCalled();
    expect(listWorkspacePropertyRegistryMock).not.toHaveBeenCalled();
  });
});
