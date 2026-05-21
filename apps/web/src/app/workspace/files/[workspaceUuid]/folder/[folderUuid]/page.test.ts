import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const {
  getAccessibleMarkdownNoteForUserMock,
  getFolderWithAncestorsMock,
  getWorkspaceRouteContextMock,
  listWorkspacesForUserMock,
  workspaceFolderRoutePageClientMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
    getAccessibleMarkdownNoteForUserMock: vi.fn(),
    getFolderWithAncestorsMock: vi.fn(),
    getWorkspaceRouteContextMock: vi.fn(),
    listWorkspacesForUserMock: vi.fn(),
    workspaceFolderRoutePageClientMock: vi.fn(() => null),
    workspaceRoutePlaceholderMock: vi.fn(() => null),
  }));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/files/workspace-folder-route-page-client", () => ({
  WorkspaceFolderRoutePageClient: workspaceFolderRoutePageClientMock,
}));

vi.mock("@/lib/file-data", () => ({
  getAccessibleMarkdownNoteForUser: getAccessibleMarkdownNoteForUserMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getWorkspaceRouteContext: getWorkspaceRouteContextMock,
}));

import WorkspaceFolderPage, { dynamic, generateMetadata } from "./page";

describe("WorkspaceFolderPage", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the selected note title when a note file is open on the route", async () => {
    getWorkspaceRouteContextMock.mockResolvedValue({
      session: { user: { id: "user-1" } },
      workspace: { rootFolderId: "folder-1", workspaceId: "workspace-1" },
    });
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Dev Workspace",
        rootFolderId: "folder-1",
        workspaceId: "workspace-1",
      },
    ]);
    getAccessibleMarkdownNoteForUserMock.mockResolvedValue({
      file: { name: "welcome.md" },
      note: { content: "# Welcome to Avenire\n\nHi UX QA Mobile Fix," },
      workspaceId: "workspace-1",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({
        folderUuid: "folder-1",
        workspaceUuid: "workspace-1",
      }),
      searchParams: Promise.resolve({
        file: "note-1",
      }),
    });

    expect(metadata.title).toBe("Welcome to Avenire — Avenire");
    expect(metadata.robots).toEqual({ follow: false, index: false });
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
  });

  it("falls back to the folder title when no note file is selected", async () => {
    getWorkspaceRouteContextMock.mockResolvedValue({
      session: { user: { id: "user-1" } },
      workspace: { rootFolderId: "root-folder", workspaceId: "workspace-1" },
    });
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Dev Workspace",
        rootFolderId: "root-folder",
        workspaceId: "workspace-1",
      },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { name: "Lecture Notes" },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({
        folderUuid: "folder-2",
        workspaceUuid: "workspace-1",
      }),
      searchParams: Promise.resolve({}),
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
