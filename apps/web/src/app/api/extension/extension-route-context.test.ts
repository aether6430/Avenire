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
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
    ]);
    listWorkspaceFoldersMock.mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Inbox",
      },
    ]);
    getExtensionDestinationPresetMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440003",
    });
  });

  it("resolves accessible extension workspaces and rejects forbidden or missing ones", async () => {
    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "  550e8400-e29b-41d4-a716-446655440000  ",
      })
    ).toEqual({
      success: true,
      workspace: expect.objectContaining({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      }),
      workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
    });

    userCanAccessWorkspaceMock.mockResolvedValueOnce(false);
    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
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
        workspaceUuid: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toEqual({
      error: "Workspace not found",
      status: 404,
      success: false,
    });

    expect(
      await resolveAccessibleExtensionWorkspaceContext({
        userId: "user-1",
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      error: "Invalid workspaceUuid",
      status: 400,
      success: false,
    });
    expect(userCanAccessWorkspaceMock).toHaveBeenCalledTimes(3);
  });

  it("resolves destination workspace/folder context and rejects read-only or missing folders", async () => {
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "550e8400-e29b-41d4-a716-446655440002",
        userId: "user-1",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toEqual({
      folder: expect.objectContaining({
        id: "550e8400-e29b-41d4-a716-446655440002",
      }),
      success: true,
      workspace: expect.objectContaining({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });

    userCanEditFolderMock.mockResolvedValueOnce(false);
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "550e8400-e29b-41d4-a716-446655440002",
        userId: "user-1",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toEqual({
      error: "Read-only folder",
      status: 403,
      success: false,
    });

    listWorkspaceFoldersMock.mockResolvedValueOnce([]);
    expect(
      await resolveExtensionDestinationWorkspaceFolderContext({
        folderId: "550e8400-e29b-41d4-a716-446655440002",
        userId: "user-1",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
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
        presetId: "  550e8400-e29b-41d4-a716-446655440003  ",
        userId: "user-1",
      })
    ).toEqual({
      destination: { id: "550e8400-e29b-41d4-a716-446655440003" },
      presetId: "550e8400-e29b-41d4-a716-446655440003",
      success: true,
    });

    getExtensionDestinationPresetMock.mockResolvedValueOnce(null);
    expect(
      await getOwnedExtensionDestinationPreset({
        presetId: "550e8400-e29b-41d4-a716-446655440003",
        userId: "user-1",
      })
    ).toEqual({
      error: "Destination not found",
      status: 404,
      success: false,
    });

    expect(
      await getOwnedExtensionDestinationPreset({
        presetId: "preset-1",
        userId: "user-1",
      })
    ).toEqual({
      error: "Invalid presetId",
      status: 400,
      success: false,
    });
  });
});
