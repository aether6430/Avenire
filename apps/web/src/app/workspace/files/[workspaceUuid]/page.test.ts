import { describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  headersMock,
  listWorkspacesForUserMock,
  redirectMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
  listWorkspacesForUserMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  workspaceRoutePlaceholderMock: vi.fn(() => null),
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

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

import WorkspaceFilesWorkspacePage, { dynamic, generateMetadata } from "./page";

describe("WorkspaceFilesWorkspacePage metadata", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the workspace name for the root files route title", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([
      {
        name: "Dev Workspace",
        workspaceId: "workspace-1",
      },
    ]);

    const metadata = await generateMetadata({
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(metadata.title).toBe("Dev Workspace — Avenire");
  });

  it("fails closed to Files when the viewer is anonymous", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(metadata.title).toBe("Files — Avenire");
  });
});

describe("WorkspaceFilesWorkspacePage route", () => {
  it("redirects the workspace files root to the canonical folder route", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([
      {
        name: "Dev Workspace",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);

    await expect(
      WorkspaceFilesWorkspacePage({
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
        searchParams: Promise.resolve({
          file: "file-1",
          overlay: "settings",
        }),
      })
    ).rejects.toThrow(
      "redirect:/workspace/files/workspace-1/folder/root-1?file=file-1&overlay=settings"
    );

    expect(redirectMock).toHaveBeenCalledWith(
      "/workspace/files/workspace-1/folder/root-1?file=file-1&overlay=settings"
    );
  });

  it("redirects anonymous visitors to login", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    await expect(
      WorkspaceFilesWorkspacePage({
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("shows an explicit not-found state when the requested workspace is unavailable", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([]);

    const element = await WorkspaceFilesWorkspacePage({
      params: Promise.resolve({ workspaceUuid: "workspace-missing" }),
      searchParams: Promise.resolve({}),
    });

    expect(element.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props).toEqual({
      label: "Workspace not found.",
      pending: false,
    });
  });

  it("shows an explicit unavailable state when the workspace has no root folder", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    listWorkspacesForUserMock.mockResolvedValueOnce([
      {
        name: "Dev Workspace",
        rootFolderId: null,
        workspaceId: "workspace-1",
      },
    ]);

    const element = await WorkspaceFilesWorkspacePage({
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      searchParams: Promise.resolve({}),
    });

    expect(element.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props).toEqual({
      label: "Workspace files unavailable.",
      pending: false,
    });
  });
});
