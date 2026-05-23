import { describe, expect, it } from "vitest";
import {
  IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
  IMPORT_EXECUTION_PROVIDER_UNAVAILABLE_STATUS,
  IMPORT_EXECUTION_RUNTIME_ERROR_STATUS,
  parseGoogleDriveImportRoutePayload,
  parseNotionImportRoutePayload,
  resolveImportExecutionRouteError,
} from "@/app/api/imports/imports-execution-route-model";

describe("imports execution route model", () => {
  it("normalizes and validates google drive import payloads", () => {
    expect(
      parseGoogleDriveImportRoutePayload({
        fileIds: [" file-1 ", "file-2"],
      })
    ).toEqual({
      data: {
        fileIds: ["file-1", "file-2"],
      },
      success: true,
    });
    expect(parseGoogleDriveImportRoutePayload({})).toEqual({
      error: IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
      success: false,
    });
  });

  it("normalizes and validates notion import payloads and import execution errors", () => {
    expect(
      parseNotionImportRoutePayload({
        pageIds: [" page-1 ", "page-2"],
      })
    ).toEqual({
      data: {
        pageIds: ["page-1", "page-2"],
      },
      success: true,
    });
    expect(parseNotionImportRoutePayload({})).toEqual({
      error: IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
      success: false,
    });

    expect(
      resolveImportExecutionRouteError(new Error("notion offline"), {
        fallback: "Unable to load Notion pages.",
      })
    ).toEqual({
      error: "notion offline",
      status: IMPORT_EXECUTION_RUNTIME_ERROR_STATUS,
    });

    expect(
      resolveImportExecutionRouteError(
        new Error("google account is not connected."),
        {
          fallback: "Unable to import files.",
        }
      )
    ).toEqual({
      error: "google account is not connected.",
      status: IMPORT_EXECUTION_PROVIDER_UNAVAILABLE_STATUS,
    });
  });
});
