import { Exit, Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import { completeSchema } from "./upload-session-complete-model";

describe("upload session completion model", () => {
  it("accepts direct and multipart completion requests", () => {
    expect(
      Exit.isSuccess(
        Schema.decodeUnknownExit(completeSchema)({
          storageKey: "uploads/file.pdf",
          storageUrl: "https://storage.example/file.pdf",
          sizeBytes: 2048,
          mimeType: "application/pdf",
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
      "an empty direct storage key",
      {
        storageKey: "",
        storageUrl: "https://storage.example/file",
        sizeBytes: 1,
      },
    ],
    [
      "an empty direct storage URL",
      { storageKey: "uploads/file", storageUrl: "", sizeBytes: 1 },
    ],
    [
      "a negative direct size",
      {
        storageKey: "uploads/file",
        storageUrl: "https://storage.example/file",
        sizeBytes: -1,
      },
    ],
    [
      "a non-integer direct size",
      {
        storageKey: "uploads/file",
        storageUrl: "https://storage.example/file",
        sizeBytes: 1.5,
      },
    ],
    ["a non-positive multipart part", { multipart: { partNumbers: [0] } }],
  ])("rejects %s", (_case, input) => {
    expect(
      Exit.isSuccess(Schema.decodeUnknownExit(completeSchema)(input))
    ).toBe(false);
  });
});
