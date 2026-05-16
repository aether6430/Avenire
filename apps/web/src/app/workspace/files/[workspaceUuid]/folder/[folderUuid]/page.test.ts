import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const {
  getFolderWithAncestorsMock,
  getSessionMock,
  headersMock,
  listWorkspacesForUserMock,
  workspaceFolderRoutePageClientMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  getFolderWithAncestorsMock: vi.fn(),
  getSessionMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
  listWorkspacesForUserMock: vi.fn(),
  workspaceFolderRoutePageClientMock: vi.fn(() => null),
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

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/files/workspace-folder-route-page-client", () => ({
  WorkspaceFolderRoutePageClient: workspaceFolderRoutePageClientMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFolderWithAncestors: getFolderWithAncestorsMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

import WorkspaceFolderPage, { dynamic, generateMetadata } from "./page";

describe("WorkspaceFolderPage", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the workspace name when the folder route points at the root folder", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    getFolderWithAncestorsMock.mockResolvedValueOnce({
      folder: {
        id: "folder-1",
        name: "Root Folder",
        parentId: null,
      },
    });
    listWorkspacesForUserMock.mockResolvedValueOnce([
      {
        name: "Dev Workspace",
        workspaceId: "workspace-1",
      },
    ]);

    const metadata = await generateMetadata({
      params: Promise.resolve({
        folderUuid: "folder-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(metadata.title).toBe("Dev Workspace — Avenire");
  });

  it("uses the nested folder name when browsing deeper than the workspace root", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    getFolderWithAncestorsMock.mockResolvedValueOnce({
      folder: {
        id: "folder-2",
        name: "Lecture Notes",
        parentId: "folder-1",
      },
    });
    listWorkspacesForUserMock.mockResolvedValueOnce([
      {
        name: "Dev Workspace",
        workspaceId: "workspace-1",
      },
    ]);

    const metadata = await generateMetadata({
      params: Promise.resolve({
        folderUuid: "folder-2",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(metadata.title).toBe("Lecture Notes — Avenire");
  });

  it("passes explicit route params into the client page", async () => {
    const element = await WorkspaceFolderPage({
      params: Promise.resolve({
        folderUuid: "folder-1",
        workspaceUuid: "workspace-1",
      }),
    });

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(
      workspaceFolderRoutePageClientMock
    );
    expect(element.props.children.props).toEqual({
      folderUuid: "folder-1",
      workspaceUuid: "workspace-1",
    });
  });
});
