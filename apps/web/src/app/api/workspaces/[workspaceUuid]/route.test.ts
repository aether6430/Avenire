import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookiesMock,
  deleteWorkspaceForUserMock,
  getSessionUserMock,
  listWorkspacesForUserMock,
  updateWorkspaceLogoForUserMock,
  validateSudoCookieMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  deleteWorkspaceForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  updateWorkspaceLogoForUserMock: vi.fn(),
  validateSudoCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/file-data", () => ({
  deleteWorkspaceForUser: deleteWorkspaceForUserMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  updateWorkspaceLogoForUser: updateWorkspaceLogoForUserMock,
}));

vi.mock("@/lib/sudo", () => ({
  SUDO_COOKIE_NAME: "avenire_sudo",
  validateSudoCookie: validateSudoCookieMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { DELETE, PATCH } from "./route";

describe("/api/workspaces/[workspaceUuid] route", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    deleteWorkspaceForUserMock.mockReset();
    getSessionUserMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    updateWorkspaceLogoForUserMock.mockReset();
    validateSudoCookieMock.mockReset();

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "sudo-cookie" }),
    });
    listWorkspacesForUserMock.mockResolvedValue([{ id: "workspace-2" }]);
    validateSudoCookieMock.mockReturnValue(true);
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
});
