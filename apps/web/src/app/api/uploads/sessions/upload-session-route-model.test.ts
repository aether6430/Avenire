import { Exit, Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import { createUploadSessionSchema } from "./upload-session-route-model";

const workspaceUuid = "82e49488-2f47-4ee3-9415-372d35bb2c3f";
const folderId = "217d0c5a-f399-4b24-b1c4-13bb872de9f4";

describe("upload session route model", () => {
  it("accepts a bounded upload-session request", () => {
    const result = Schema.decodeUnknownExit(createUploadSessionSchema)({
      workspaceUuid,
      folderId,
      name: "lecture-notes.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksumSha256: "a".repeat(64),
    });

    expect(Exit.isSuccess(result)).toBe(true);
  });

  it.each([
    [
      "non-UUID workspace",
      { workspaceUuid: "workspace", folderId, name: "a.pdf", sizeBytes: 1 },
    ],
    ["empty filename", { workspaceUuid, folderId, name: "", sizeBytes: 1 }],
    [
      "oversized filename",
      { workspaceUuid, folderId, name: "a".repeat(256), sizeBytes: 1 },
    ],
    [
      "negative size",
      { workspaceUuid, folderId, name: "a.pdf", sizeBytes: -1 },
    ],
    [
      "fractional size",
      { workspaceUuid, folderId, name: "a.pdf", sizeBytes: 1.5 },
    ],
  ])("rejects %s", (_case, input) => {
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(createUploadSessionSchema)(input))
    ).toBe(false);
  });
});
