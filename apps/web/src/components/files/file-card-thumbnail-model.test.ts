import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatTimeAgo,
  markdownToPreviewLines,
} from "@/components/files/file-card-thumbnail-model";
import { MarkdownThumbnail } from "@/components/files/markdown-thumbnail";

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

  it("renders a darker document-grid markdown thumbnail shell instead of an SVG snapshot", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownThumbnail, {
        content: "# Hello world\n\nThis is the body.",
      })
    );

    expect(html).toContain("bg-[#151515]");
    expect(html).toContain("grid-cols-[1.1fr_0.85fr_0.85fr]");
    expect(html).toContain("border-white/8");
    expect(html).not.toContain("<img");
  });
});
