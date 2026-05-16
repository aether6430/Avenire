import { afterEach, describe, expect, it } from "vitest";
import {
  buildUploadSessionPartUploadUrl,
  isUploadSessionExpired,
  parseUploadSessionPartNumber,
  resolveUploadSessionMaxPartBytes,
  uploadSessionPartsSchema,
} from "./upload-session-parts-model";

describe("upload session parts model", () => {
  const originalMaxPartBytes = process.env.UPLOAD_SESSION_MAX_PART_BYTES;

  afterEach(() => {
    if (originalMaxPartBytes === undefined) {
      process.env.UPLOAD_SESSION_MAX_PART_BYTES = undefined;
    } else {
      process.env.UPLOAD_SESSION_MAX_PART_BYTES = originalMaxPartBytes;
    }
  });

  it("validates multipart part-number requests", () => {
    expect(
      uploadSessionPartsSchema.safeParse({
        partNumbers: [1, 2, 3],
      }).success
    ).toBe(true);
    expect(
      uploadSessionPartsSchema.safeParse({
        partNumbers: [],
      }).success
    ).toBe(false);
  });

  it("resolves max part bytes from env with a stable fallback", () => {
    process.env.UPLOAD_SESSION_MAX_PART_BYTES = undefined;
    expect(resolveUploadSessionMaxPartBytes()).toBe(16 * 1024 * 1024);

    process.env.UPLOAD_SESSION_MAX_PART_BYTES = "8192";
    expect(resolveUploadSessionMaxPartBytes()).toBe(8192);
  });

  it("detects expiry and parses positive part numbers only", () => {
    expect(isUploadSessionExpired("1970-01-01T00:00:00.000Z", 1)).toBe(true);
    expect(isUploadSessionExpired("2099-01-01T00:00:00.000Z", Date.now())).toBe(
      false
    );
    expect(parseUploadSessionPartNumber("7")).toBe(7);
    expect(parseUploadSessionPartNumber("0")).toBeNull();
    expect(parseUploadSessionPartNumber("abc")).toBeNull();
  });

  it("builds stable signed upload URLs for multipart part PUTs", () => {
    expect(
      buildUploadSessionPartUploadUrl({
        origin: "http://localhost:3003",
        sessionId: "session-1",
        partNumber: 4,
        token: "token-1",
      })
    ).toBe(
      "http://localhost:3003/api/uploads/sessions/session-1/parts/4?token=token-1"
    );
  });
});
