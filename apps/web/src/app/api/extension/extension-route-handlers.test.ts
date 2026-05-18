import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createExtensionDestinationPresetMock,
  deleteExtensionDestinationPresetMock,
  getFolderWithAncestorsMock,
  getOwnedExtensionDestinationPresetMock,
  listExtensionDestinationPresetsMock,
  listWorkspaceFoldersMock,
  listWorkspacesForUserMock,
  resolveAccessibleExtensionWorkspaceContextMock,
  resolveExtensionDestinationWorkspaceFolderContextMock,
  updateExtensionDestinationPresetMock,
} = vi.hoisted(() => ({
  createExtensionDestinationPresetMock: vi.fn(),
  deleteExtensionDestinationPresetMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getOwnedExtensionDestinationPresetMock: vi.fn(),
  listExtensionDestinationPresetsMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  resolveAccessibleExtensionWorkspaceContextMock: vi.fn(),
  resolveExtensionDestinationWorkspaceFolderContextMock: vi.fn(),
  updateExtensionDestinationPresetMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  createExtensionDestinationPreset: createExtensionDestinationPresetMock,
  deleteExtensionDestinationPreset: deleteExtensionDestinationPresetMock,
  listExtensionDestinationPresets: listExtensionDestinationPresetsMock,
  updateExtensionDestinationPreset: updateExtensionDestinationPresetMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFolderWithAncestors: getFolderWithAncestorsMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

vi.mock("./extension-route-context", () => ({
  getOwnedExtensionDestinationPreset: getOwnedExtensionDestinationPresetMock,
  resolveAccessibleExtensionWorkspaceContext:
    resolveAccessibleExtensionWorkspaceContextMock,
  resolveExtensionDestinationWorkspaceFolderContext:
    resolveExtensionDestinationWorkspaceFolderContextMock,
}));

import { handleExtensionDestinationRouteDelete } from "@/app/api/extension/destinations/[id]/extension-destination-route-delete";
import { handleExtensionDestinationRoutePatch } from "@/app/api/extension/destinations/[id]/extension-destination-route-patch";
import { handleExtensionDestinationsRouteGet } from "@/app/api/extension/destinations/extension-destinations-route-get";
import { handleExtensionDestinationsRoutePost } from "@/app/api/extension/destinations/extension-destinations-route-post";
import { handleExtensionMeRouteGet } from "@/app/api/extension/me/extension-me-route-get";
import { handleExtensionWorkspaceFoldersRouteGet } from "@/app/api/extension/workspaces/[workspaceUuid]/folders/extension-workspace-folders-route-get";
import { handleExtensionWorkspacesRouteGet } from "@/app/api/extension/workspaces/extension-workspaces-route-get";

describe("extension route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "root-1", name: "Workspace", parentId: null },
      { id: "folder-1", name: "Inbox", parentId: "root-1" },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      ancestors: [{ id: "root-1", name: "Workspace" }],
      folder: { id: "folder-1", name: "Inbox", parentId: "root-1" },
    });
    resolveAccessibleExtensionWorkspaceContextMock.mockResolvedValue({
      success: true,
      workspace: {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      workspaceUuid: "workspace-1",
    });
    listExtensionDestinationPresetsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-18T00:00:00.000Z"),
        folderId: "folder-1",
        folderName: "Inbox",
        id: "preset-1",
        label: "Inbox",
        organizationId: "org-1",
        updatedAt: new Date("2026-05-18T01:00:00.000Z"),
        workspaceId: "workspace-1",
        workspaceName: "Aveniri",
      },
    ]);
    resolveExtensionDestinationWorkspaceFolderContextMock.mockResolvedValue({
      folder: { id: "folder-1", name: "Inbox" },
      success: true,
      workspace: {
        name: "Aveniri",
        organizationId: "org-1",
        workspaceId: "workspace-1",
      },
    });
    createExtensionDestinationPresetMock.mockResolvedValue({
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      folderId: "folder-1",
      folderName: "Inbox",
      id: "preset-1",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: new Date("2026-05-18T01:00:00.000Z"),
      workspaceId: "workspace-1",
      workspaceName: "Aveniri",
    });
    getOwnedExtensionDestinationPresetMock.mockResolvedValue({
      destination: { id: "preset-1" },
      success: true,
    });
    updateExtensionDestinationPresetMock.mockResolvedValue({
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      folderId: "folder-1",
      folderName: "Inbox",
      id: "preset-1",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: new Date("2026-05-18T01:00:00.000Z"),
      workspaceId: "workspace-1",
      workspaceName: "Aveniri",
    });
    deleteExtensionDestinationPresetMock.mockResolvedValue(true);
  });

  it("returns the extension me payload unchanged", async () => {
    const response = await handleExtensionMeRouteGet({
      user: { id: "user-1", name: "Owner" },
    });

    await expect(response.json()).resolves.toEqual({
      user: { id: "user-1", name: "Owner" },
    });
  });

  it("loads extension workspaces and destinations, and maps failures explicitly", async () => {
    const workspaces = await handleExtensionWorkspacesRouteGet({
      userId: "user-1",
    });
    const destinations = await handleExtensionDestinationsRouteGet({
      userId: "user-1",
    });

    await expect(workspaces.json()).resolves.toEqual({
      workspaces: [
        expect.objectContaining({
          workspaceId: "workspace-1",
        }),
      ],
    });
    await expect(destinations.json()).resolves.toEqual({
      destinations: [
        expect.objectContaining({
          folderId: "folder-1",
          id: "preset-1",
        }),
      ],
    });

    listExtensionDestinationPresetsMock.mockRejectedValueOnce(
      new Error("destinations offline")
    );
    const failed = await handleExtensionDestinationsRouteGet({
      userId: "user-1",
    });
    expect(failed.status).toBe(400);
    await expect(failed.json()).resolves.toEqual({
      error: "destinations offline",
    });
  });

  it("loads extension folders and handles inaccessible or missing folder contexts", async () => {
    const response = await handleExtensionWorkspaceFoldersRouteGet({
      request: new Request(
        "https://avenire.space/api/extension/workspaces/workspace-1/folders?parentId=folder-1"
      ),
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });

    await expect(response.json()).resolves.toEqual({
      ancestors: [{ id: "root-1", name: "Workspace" }],
      currentFolder: { id: "folder-1", name: "Inbox", parentId: "root-1" },
      folders: [],
      rootFolderId: "root-1",
    });

    resolveAccessibleExtensionWorkspaceContextMock.mockResolvedValueOnce({
      error: "Forbidden",
      status: 403,
      success: false,
    });
    const forbidden = await handleExtensionWorkspaceFoldersRouteGet({
      request: new Request("https://avenire.space"),
      userId: "user-1",
      workspaceUuid: "workspace-1",
    });
    expect(forbidden.status).toBe(403);
  });

  it("creates, updates, and deletes extension destinations with explicit failure paths", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    } as never;

    const created = await handleExtensionDestinationsRoutePost({
      request,
      userId: "user-1",
    });
    expect(created.status).toBe(201);

    const patched = await handleExtensionDestinationRoutePatch({
      params: Promise.resolve({ id: "preset-1" }),
      request,
      userId: "user-1",
    });
    await expect(patched.json()).resolves.toEqual({
      destination: expect.objectContaining({ id: "preset-1" }),
    });

    deleteExtensionDestinationPresetMock.mockResolvedValueOnce(false);
    const missingDelete = await handleExtensionDestinationRouteDelete({
      params: Promise.resolve({ id: "preset-1" }),
      userId: "user-1",
    });
    expect(missingDelete.status).toBe(404);
    await expect(missingDelete.json()).resolves.toEqual({
      error: "Destination not found",
    });
  });
});
