import { describe, expect, it } from "vitest";
import {
  extractMarkdownNotePayload,
  inferMimeTypeFromName,
  isMarkdownUpload,
  normalizeSha256,
  normalizeUploadThingStorageUrl,
  resolveMimeType,
} from "@/lib/upload-registration-model";

describe("upload registration model", () => {
  it("normalizes sha256 values conservatively", () => {
    expect(
      normalizeSha256(
        " ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef0123456789 "
      )
    ).toBe("abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789");
    expect(normalizeSha256("not-a-hash")).toBeNull();
  });

  it("infers and resolves mime types from file names when needed", () => {
    expect(inferMimeTypeFromName("lecture.pdf")).toBe("application/pdf");
    expect(inferMimeTypeFromName("clip.mp4")).toBe("video/mp4");
    expect(
      resolveMimeType({
        mimeType: "application/octet-stream",
        name: "lecture.md",
      })
    ).toBe("text/markdown");
    expect(resolveMimeType({ mimeType: "video/*", name: "clip.mp4" })).toBeNull();
  });

  it("detects markdown uploads and normalizes uploadthing urls", () => {
    expect(
      isMarkdownUpload({
        mimeType: "text/markdown",
        name: "notes.bin",
      })
    ).toBe(true);
    expect(
      isMarkdownUpload({
        mimeType: "text/plain",
        name: "notes.mdx",
      })
    ).toBe(true);
    expect(
      normalizeUploadThingStorageUrl(
        "https://utfs.io/f/some-old-key",
        "real-key"
      )
    ).toBe("https://utfs.io/f/real-key");
  });

  it("extracts markdown note payloads with frontmatter-derived metadata", () => {
    const payload = extractMarkdownNotePayload({
      metadata: {
        page: {
          properties: {
            existing: { type: "text", value: "keep" },
          },
        },
      },
      rawContent: `---
title: Momentum Review
tags:
  - physics
  - collisions
published: true
review-date: 2026-05-17
---

Momentum is conserved.`,
    });

    expect(payload.content).toContain("# Momentum Review");
    expect(payload.metadata?.page).toMatchObject({
      properties: {
        existing: { type: "text", value: "keep" },
        published: { type: "checkbox", value: true },
        tags: { type: "multi_select", value: ["physics", "collisions"] },
      },
    });
    expect(payload.contentHashSha256).toHaveLength(64);
  });
});
