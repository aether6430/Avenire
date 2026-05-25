import { describe, expect, it } from "vitest";
import {
  buildPreviewAttachmentCapabilities,
  formatPreviewAttachmentFileSize,
  isPreviewAttachmentCodeLike,
} from "@/components/chat/preview-attachment-model";

describe("preview attachment model", () => {
  it("detects code-like attachments from mime type and extension", () => {
    expect(isPreviewAttachmentCodeLike("text/plain", "notes.txt")).toBe(true);
    expect(
      isPreviewAttachmentCodeLike("application/octet-stream", "script.py")
    ).toBe(true);
    expect(isPreviewAttachmentCodeLike("image/png", "shot.png")).toBe(false);
  });

  it("formats file sizes for KB and MB ranges", () => {
    expect(formatPreviewAttachmentFileSize(undefined)).toBe("");
    expect(formatPreviewAttachmentFileSize(1536)).toBe("1.5KB");
    expect(formatPreviewAttachmentFileSize(2.5 * 1024 * 1024)).toBe("2.5MB");
  });

  it("builds preview capability flags from attachment metadata", () => {
    expect(
      buildPreviewAttachmentCapabilities({
        contentType: "image/png",
        name: "diagram.png",
        previewUrl: "https://cdn.test/diagram.png",
        status: "completed",
      })
    ).toEqual({
      canPreview: true,
      isCodePreview: false,
      isImagePreview: true,
      isPdfPreview: false,
      isVideoPreview: false,
    });

    expect(
      buildPreviewAttachmentCapabilities({
        contentType: "application/pdf",
        name: "report.pdf",
        previewUrl: "",
        status: "completed",
      }).canPreview
    ).toBe(false);

    expect(
      buildPreviewAttachmentCapabilities({
        contentType: "text/plain",
        file: new File(["hello"], "note.txt", { type: "text/plain" }),
        name: "note.txt",
        source: "local",
        status: "pending",
      })
    ).toEqual({
      canPreview: true,
      isCodePreview: true,
      isImagePreview: false,
      isPdfPreview: false,
      isVideoPreview: false,
    });

    expect(
      buildPreviewAttachmentCapabilities({
        contentType: "image/png",
        name: "diagram.png",
        previewUrl: "blob:https://app.example.com/diagram",
        source: "local",
        status: "pending",
      })
    ).toEqual({
      canPreview: true,
      isCodePreview: false,
      isImagePreview: true,
      isPdfPreview: false,
      isVideoPreview: false,
    });
  });
});
