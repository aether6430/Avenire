import { describe, expect, it } from "vitest";
import {
  inferFileMimeTypeFromName,
  isFileMimeTypeConsistent,
  normalizeFileMimeType,
  resolveFileMimeType,
} from "./file-contract";

describe("file contract", () => {
  it("uses concrete canonical MIME types and rejects wildcards", () => {
    expect(inferFileMimeTypeFromName("lecture.MP4")).toBe("video/mp4");
    expect(inferFileMimeTypeFromName("scan.jpeg")).toBe("image/jpeg");
    expect(normalizeFileMimeType("video/*")).toBeNull();
    expect(normalizeFileMimeType("image/jpg; charset=binary")).toBe(
      "image/jpeg"
    );
  });

  it("rejects declared MIME types that contradict the extension", () => {
    expect(
      isFileMimeTypeConsistent({
        declaredMimeType: "image/png",
        name: "payload.pdf",
      })
    ).toBe(false);
    expect(
      resolveFileMimeType({
        declaredMimeType: "application/pdf",
        name: "payload.pdf",
      })
    ).toBe("application/pdf");
    expect(
      resolveFileMimeType({
        declaredMimeType: "application/octet-stream; charset=binary",
        name: "payload.pdf",
      })
    ).toBe("application/pdf");
    expect(
      isFileMimeTypeConsistent({
        declaredMimeType: "Application/Octet-Stream",
        name: "payload.pdf",
      })
    ).toBe(true);
  });

  it("rejects double-extension and unsupported payloads by final extension", () => {
    expect(inferFileMimeTypeFromName("lecture.pdf.exe")).toBeNull();
    expect(
      isFileMimeTypeConsistent({
        declaredMimeType: "application/pdf",
        name: "lecture.pdf.exe",
      })
    ).toBe(false);
    expect(inferFileMimeTypeFromName("no-extension")).toBeNull();
  });
});
