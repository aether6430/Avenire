"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PreviewAttachmentHoverPreview,
  PreviewAttachmentModal,
  PreviewAttachmentPillIcon,
  PreviewAttachmentThumbnail,
} from "@/components/chat/preview-attachment-content";

describe("preview attachment content", () => {
  it("renders a pdf thumbnail and busy pill icon", () => {
    const thumbnail = renderToStaticMarkup(
      <PreviewAttachmentThumbnail contentType="application/pdf" />
    );
    const pill = renderToStaticMarkup(
      <PreviewAttachmentPillIcon status="uploading" />
    );

    expect(thumbnail).toContain("PDF");
    expect(pill).toContain("animate-spin");
  });

  it("renders code hover previews and modal fallbacks through the content barrel", () => {
    const hover = renderToStaticMarkup(
      <PreviewAttachmentHoverPreview
        capabilities={{
          canPreview: true,
          isCodePreview: true,
          isImagePreview: false,
          isPdfPreview: false,
          isVideoPreview: false,
        }}
        textPreview={"const a = 1;\n".repeat(50)}
      />
    );

    expect(hover).toContain("const a = 1;");
    expect(typeof PreviewAttachmentModal).toBe("function");
  });
});
