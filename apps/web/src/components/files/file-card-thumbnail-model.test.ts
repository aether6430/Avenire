import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMarkdownThumbnailSvg,
  formatTimeAgo,
  markdownToPreviewLines,
} from "@/components/files/file-card-thumbnail-model";

describe("file-card thumbnail model", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats relative time labels for recent and older updates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-12T18:00:00.000Z"));

    expect(formatTimeAgo(new Date("2026-05-12T17:59:45.000Z"))).toBe("now");
    expect(formatTimeAgo(new Date("2026-05-12T17:30:00.000Z"))).toBe("30m");
    expect(formatTimeAgo(new Date("2026-05-10T18:00:00.000Z"))).toBe("2d");
    expect(formatTimeAgo(new Date("2026-03-12T18:00:00.000Z"))).toBe("2mo");
  });

  it("normalizes markdown into preview-friendly lines", () => {
    const lines = markdownToPreviewLines(`---
title: Demo
---

# Heading

- First item
> Quoted line
Inline \`code\` and [link](https://example.com)
[[Target Page|Visible Wiki Label]]
`);

    expect(lines).toEqual([
      "Heading",
      "",
      "First item",
      "Quoted line",
      "Inline code and link",
      "Visible Wiki Label",
    ]);
  });

  it("builds an svg data url for markdown thumbnails", () => {
    const src = buildMarkdownThumbnailSvg(
      "# Hello world\n\nThis is the body.",
      false
    );

    expect(src.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(src.split(",")[1] ?? "")).toContain(
      "Hello world"
    );
    expect(decodeURIComponent(src.split(",")[1] ?? "")).toContain(
      "This is the body."
    );
  });
});
