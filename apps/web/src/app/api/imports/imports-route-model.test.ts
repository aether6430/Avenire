import { describe, expect, it } from "vitest";
import {
  IMPORT_DESTINATION_INVALID_PAYLOAD_ERROR,
  IMPORT_DESTINATION_INVALID_WORKSPACE_ID_ERROR,
  IMPORT_DESTINATION_WORKSPACE_REQUIRED_ERROR,
  normalizeImportRouteUuidInput,
  parseImportDestinationPayload,
  resolveImportDestinationWorkspaceId,
  resolveImportsRouteError,
} from "@/app/api/imports/imports-route-model";

describe("imports route model", () => {
  it("normalizes and validates import destination payloads", () => {
    expect(normalizeImportRouteUuidInput("  workspace-1  ")).toBe(
      "workspace-1"
    );

    expect(
      parseImportDestinationPayload({
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).toEqual({
      data: {
        folderId: "550e8400-e29b-41d4-a716-446655440001",
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      },
      success: true,
    });

    expect(parseImportDestinationPayload({})).toEqual({
      error: IMPORT_DESTINATION_INVALID_PAYLOAD_ERROR,
      success: false,
    });
  });

  it("resolves required workspace ids and explicit import route errors", () => {
    expect(
      resolveImportDestinationWorkspaceId(
        "  550e8400-e29b-41d4-a716-446655440000  "
      )
    ).toEqual({
      success: true,
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(resolveImportDestinationWorkspaceId("")).toEqual({
      error: IMPORT_DESTINATION_WORKSPACE_REQUIRED_ERROR,
      success: false,
    });
    expect(resolveImportDestinationWorkspaceId("workspace-1")).toEqual({
      error: IMPORT_DESTINATION_INVALID_WORKSPACE_ID_ERROR,
      success: false,
    });

    expect(
      resolveImportsRouteError(new Error("imports offline"), {
        fallback: "Unable to load import settings.",
      })
    ).toEqual({
      error: "imports offline",
      status: 500,
    });
  });
});
