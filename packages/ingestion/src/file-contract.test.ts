import { describe, expect, it } from "vitest";
import {
  detectFileMimeTypeFromMagicBytes,
  fileMagicBytesMatchMimeType,
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

  it("detects binary signatures and rejects MIME spoofing", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectFileMimeTypeFromMagicBytes(pdf)).toBe("application/pdf");
    expect(fileMagicBytesMatchMimeType({ bytes: pdf, mimeType: "application/pdf" })).toBe(true);
    expect(fileMagicBytesMatchMimeType({ bytes: png, mimeType: "application/pdf" })).toBe(false);
  });

  it("validates shared-container and bounded text formats", () => {
    const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(fileMagicBytesMatchMimeType({
      bytes: zip,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })).toBe(true);
    expect(fileMagicBytesMatchMimeType({
      bytes: new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
      mimeType: "image/svg+xml",
    })).toBe(true);
    expect(fileMagicBytesMatchMimeType({
      bytes: Uint8Array.from([0x61, 0, 0x62]),
      mimeType: "text/plain",
    })).toBe(false);
  });
});
