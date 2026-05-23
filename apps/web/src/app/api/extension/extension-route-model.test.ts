import { describe, expect, it } from "vitest";
import {
  EXTENSION_INVALID_PARENT_ID_ERROR,
  EXTENSION_INVALID_PAYLOAD_ERROR,
  EXTENSION_INVALID_PRESET_ID_ERROR,
  EXTENSION_INVALID_WORKSPACE_ID_ERROR,
  normalizeExtensionRouteUuidInput,
  parseExtensionDestinationPayload,
  resolveExtensionPresetId,
  resolveExtensionRouteError,
  resolveExtensionWorkspaceFolderParentId,
  resolveExtensionWorkspaceUuid,
  serializeExtensionDestination,
} from "@/app/api/extension/extension-route-model";

describe("extension route model", () => {
  it("normalizes extension UUID inputs and validates destination payloads", () => {
    expect(normalizeExtensionRouteUuidInput("  workspace-1  ")).toBe(
      "workspace-1"
    );

    expect(
      parseExtensionDestinationPayload({
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        label: "  Inbox  ",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toEqual({
      data: {
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        label: "Inbox",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
      success: true,
    });

    expect(parseExtensionDestinationPayload({})).toEqual({
      error: EXTENSION_INVALID_PAYLOAD_ERROR,
      success: false,
    });
  });

  it("resolves folder parents, serializes destinations, and maps extension route errors", () => {
    expect(
      resolveExtensionWorkspaceFolderParentId({
        parentId: "  550e8400-e29b-41d4-a716-446655440002  ",
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
      })
    ).toEqual({
      parentId: "550e8400-e29b-41d4-a716-446655440002",
      success: true,
    });
    expect(
      resolveExtensionWorkspaceFolderParentId({
        parentId: "",
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
      })
    ).toEqual({
      parentId: "550e8400-e29b-41d4-a716-446655440001",
      success: true,
    });
    expect(
      resolveExtensionWorkspaceFolderParentId({
        parentId: "parent-1",
        rootFolderId: "550e8400-e29b-41d4-a716-446655440001",
      })
    ).toEqual({
      error: EXTENSION_INVALID_PARENT_ID_ERROR,
      success: false,
    });
    expect(
      resolveExtensionWorkspaceUuid("  550e8400-e29b-41d4-a716-446655440000  ")
    ).toEqual({
      success: true,
      value: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(resolveExtensionWorkspaceUuid("workspace-1")).toEqual({
      error: EXTENSION_INVALID_WORKSPACE_ID_ERROR,
      success: false,
    });
    expect(
      resolveExtensionPresetId("  550e8400-e29b-41d4-a716-446655440003  ")
    ).toEqual({
      success: true,
      value: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(resolveExtensionPresetId("preset-1")).toEqual({
      error: EXTENSION_INVALID_PRESET_ID_ERROR,
      success: false,
    });

    expect(
      serializeExtensionDestination({
        createdAt: new Date("2026-05-18T00:00:00.000Z"),
        folderId: "folder-1",
        folderName: "Inbox",
        id: "destination-1",
        label: "Inbox",
        organizationId: "org-1",
        updatedAt: new Date("2026-05-18T01:00:00.000Z"),
        workspaceId: "workspace-1",
        workspaceName: "Aveniri",
      })
    ).toEqual({
      createdAt: "2026-05-18T00:00:00.000Z",
      folderId: "folder-1",
      folderName: "Inbox",
      id: "destination-1",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: "2026-05-18T01:00:00.000Z",
      workspaceId: "workspace-1",
      workspaceName: "Aveniri",
    });

    expect(
      resolveExtensionRouteError(new Error("extension offline"), {
        fallback: "Unable to load extension settings.",
      })
    ).toEqual({
      error: "extension offline",
      status: 400,
    });
  });
});
