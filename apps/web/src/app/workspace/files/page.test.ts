import { describe, expect, it, vi } from "vitest";

const {
  getWorkspaceRouteContextMock,
  redirectMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  getWorkspaceRouteContextMock: vi.fn(),
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  workspaceRoutePlaceholderMock: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getWorkspaceRouteContext: getWorkspaceRouteContextMock,
}));

import WorkspaceFilesPage, { dynamic } from "./page";

describe("WorkspaceFilesPage", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("redirects the files root route to the canonical workspace root folder route", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    });

    await expect(
      WorkspaceFilesPage({
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
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: null,
      workspace: null,
    });

    await expect(
      WorkspaceFilesPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("redirect:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects signed-in visitors without an active workspace back to workspace home", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: null,
    });

    await expect(
      WorkspaceFilesPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("redirect:/workspace");

    expect(redirectMock).toHaveBeenCalledWith("/workspace");
  });

  it("shows an explicit unavailable state when the active workspace has no root folder", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: {
        rootFolderId: null,
        workspaceId: "workspace-1",
      },
    });

    const element = await WorkspaceFilesPage({
      searchParams: Promise.resolve({}),
    });

    expect(element.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props).toEqual({
      label: "Workspace files unavailable.",
      pending: false,
    });
  });
});
