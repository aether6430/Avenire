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
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Workspace",
        parentId: null,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Inbox",
        parentId: "550e8400-e29b-41d4-a716-446655440001",
      },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      ancestors: [
        { id: "550e8400-e29b-41d4-a716-446655440001", name: "Workspace" },
      ],
      folder: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Inbox",
        parentId: "550e8400-e29b-41d4-a716-446655440001",
      },
    });
    resolveAccessibleExtensionWorkspaceContextMock.mockResolvedValue({
      success: true,
      workspace: {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
      workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
    });
    listExtensionDestinationPresetsMock.mockResolvedValue([
      {
        createdAt: new Date("2026-05-18T00:00:00.000Z"),
        folderId: "550e8400-e29b-41d4-a716-446655440002",
        folderName: "Inbox",
        id: "550e8400-e29b-41d4-a716-446655440003",
        label: "Inbox",
        organizationId: "org-1",
        updatedAt: new Date("2026-05-18T01:00:00.000Z"),
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        workspaceName: "Aveniri",
      },
    ]);
    resolveExtensionDestinationWorkspaceFolderContextMock.mockResolvedValue({
      folder: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Inbox",
      },
      success: true,
      workspace: {
        name: "Aveniri",
        organizationId: "org-1",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    createExtensionDestinationPresetMock.mockResolvedValue({
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      folderId: "550e8400-e29b-41d4-a716-446655440002",
      folderName: "Inbox",
      id: "550e8400-e29b-41d4-a716-446655440003",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: new Date("2026-05-18T01:00:00.000Z"),
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      workspaceName: "Aveniri",
    });
    getOwnedExtensionDestinationPresetMock.mockResolvedValue({
      destination: { id: "550e8400-e29b-41d4-a716-446655440003" },
      success: true,
    });
    updateExtensionDestinationPresetMock.mockResolvedValue({
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      folderId: "550e8400-e29b-41d4-a716-446655440002",
      folderName: "Inbox",
      id: "550e8400-e29b-41d4-a716-446655440003",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: new Date("2026-05-18T01:00:00.000Z"),
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
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
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      ],
    });
    await expect(destinations.json()).resolves.toEqual({
      destinations: [
        expect.objectContaining({
          folderId: "550e8400-e29b-41d4-a716-446655440002",
          id: "550e8400-e29b-41d4-a716-446655440003",
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
        "https://avenire.space/api/extension/workspaces/550e8400-e29b-41d4-a716-446655440000/folders?parentId=550e8400-e29b-41d4-a716-446655440002"
      ),
      userId: "user-1",
      workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
    });

    await expect(response.json()).resolves.toEqual({
      ancestors: [
        { id: "550e8400-e29b-41d4-a716-446655440001", name: "Workspace" },
      ],
      currentFolder: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Inbox",
        parentId: "550e8400-e29b-41d4-a716-446655440001",
      },
      folders: [],
      rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
    });

    resolveAccessibleExtensionWorkspaceContextMock.mockResolvedValueOnce({
      error: "Forbidden",
      status: 403,
      success: false,
    });
    const forbidden = await handleExtensionWorkspaceFoldersRouteGet({
      request: new Request("https://avenire.space"),
      userId: "user-1",
      workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(forbidden.status).toBe(403);

    const invalidParent = await handleExtensionWorkspaceFoldersRouteGet({
      request: new Request(
        "https://avenire.space/api/extension/workspaces/550e8400-e29b-41d4-a716-446655440000/folders?parentId=folder-1"
      ),
      userId: "user-1",
      workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(invalidParent.status).toBe(400);
    await expect(invalidParent.json()).resolves.toEqual({
      error: "Invalid parentId",
    });
    expect(listWorkspaceFoldersMock).toHaveBeenCalledTimes(1);
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
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440003" }),
      request,
      userId: "user-1",
    });
    await expect(patched.json()).resolves.toEqual({
      destination: expect.objectContaining({
        id: "550e8400-e29b-41d4-a716-446655440003",
      }),
    });

    deleteExtensionDestinationPresetMock.mockResolvedValueOnce(false);
    const missingDelete = await handleExtensionDestinationRouteDelete({
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440003" }),
      userId: "user-1",
    });
    expect(missingDelete.status).toBe(404);
    await expect(missingDelete.json()).resolves.toEqual({
      error: "Destination not found",
    });
  });
});
