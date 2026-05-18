import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getExtensionDestinationPresetMock,
  listWorkspaceFoldersMock,
  listWorkspacesForUserMock,
  userCanAccessWorkspaceMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  getExtensionDestinationPresetMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  userCanAccessWorkspaceMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getExtensionDestinationPreset: getExtensionDestinationPresetMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFolders: listWorkspaceFoldersMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  userCanAccessWorkspace: userCanAccessWorkspaceMock,
  userCanEditFolder: userCanEditFolderMock,
}));

import {
  getOwnedExtensionDestinationPreset,
  resolveAccessibleExtensionWorkspaceContext,
  resolveExtensionDestinationWorkspaceFolderContext,
} from "@/app/api/extension/extension-route-context";

describe("extension route context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userCanAccessWorkspaceMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      {
        id: "folder-1",
        name: "Inbox",
      },
    ]);
    getExtensionDestinationPresetMock.mockResolvedValue({
      id: "preset-1",
    });
  });

  it("resolves accessible extension workspaces and rejects forbidden or missing ones", async () => {
    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "  workspace-1  ",
      })
    ).toEqual({
      success: true,
      workspace: expect.objectContaining({ workspaceId: "workspace-1" }),
      workspaceUuid: "workspace-1",
    });

    userCanAccessWorkspaceMock.mockResolvedValueOnce(false);
    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      error: "Forbidden",
      status: 403,
      success: false,
    });

    listWorkspacesForUserMock.mockResolvedValueOnce([]);
    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      error: "Workspace not found",
      status: 404,
      success: false,
    });
  });

  it("resolves destination workspace/folder context and rejects read-only or missing folders", async () => {
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "folder-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).toEqual({
      folder: expect.objectContaining({ id: "folder-1" }),
      success: true,
      workspace: expect.objectContaining({ workspaceId: "workspace-1" }),
    });

    userCanEditFolderMock.mockResolvedValueOnce(false);
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "folder-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).toEqual({
      error: "Read-only folder",
      status: 403,
      success: false,
    });

    listWorkspaceFoldersMock.mockResolvedValueOnce([]);
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "folder-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).toEqual({
      error: "Folder not found",
      status: 404,
      success: false,
    });
  });

  it("resolves owned destination presets and fails closed for missing presets", async () => {
    expect(
      await getOwnedExtensionDestinationPreset({
        presetId: "  preset-1  ",
        userId: "user-1",
      })
    ).toEqual({
      destination: { id: "preset-1" },
      presetId: "preset-1",
      success: true,
    });

    getExtensionDestinationPresetMock.mockResolvedValueOnce(null);
    expect(
      await getOwnedExtensionDestinationPreset({
        presetId: "preset-1",
        userId: "user-1",
      })
    ).toEqual({
      error: "Destination not found",
      status: 404,
      success: false,
    });
  });
});
