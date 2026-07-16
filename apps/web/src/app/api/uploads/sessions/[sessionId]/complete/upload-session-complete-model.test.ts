import { Exit, Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import { completeSchema } from "./upload-session-complete-model";

describe("upload session completion model", () => {
  it("accepts secure multipart completion requests", () => {
    expect(
      Exit.isSuccess(
        Schema.decodeUnknownExit(completeSchema)({
          multipart: {},
        })
      )
    ).toBe(true);
    expect(
      Exit.isSuccess(
        Schema.decodeUnknownExit(completeSchema)({
          multipart: { partNumbers: [1, 2] },
          checksumSha256: "b".repeat(64),
        })
      )
    ).toBe(true);
  });

  it.each([
    [
      "a legacy caller-selected storage payload",
      {
        storageKey: "uploads/file.pdf",
        storageUrl: "https://storage.example/file.pdf",
        sizeBytes: 2048,
        mimeType: "application/pdf",
      },
    ],
    ["a non-positive multipart part", { multipart: { partNumbers: [0] } }],
  ])("rejects %s", (_case, input) => {
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(completeSchema)(input))
    ).toBe(false);
  });
});
