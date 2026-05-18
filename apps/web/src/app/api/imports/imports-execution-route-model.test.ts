import { describe, expect, it } from "vitest";
import {
  IMPORT_EXECUTION_INVALID_PAYLOAD_ERROR,
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

  it("normalizes and validates notion import payloads and errors", () => {
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
      status: 400,
    });
  });
});
