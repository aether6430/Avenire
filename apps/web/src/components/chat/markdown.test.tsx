"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { MemoizedMarkdownSurfaceMock } = vi.hoisted(() => ({
  MemoizedMarkdownSurfaceMock: vi.fn(() => <div>MARKDOWN_SURFACE</div>),
}));

vi.mock("@/components/chat/markdown-surface", () => ({
  MemoizedMarkdownSurface: MemoizedMarkdownSurfaceMock,
}));

import { Markdown } from "@/components/chat/markdown";

describe("Markdown", () => {
  it("passes the render props through to the markdown surface", () => {
    const html = renderToStaticMarkup(
      <Markdown
        className="chat-copy"
        content="**hello**"
        id="msg-1"
        parseIncompleteMarkdown={false}
        textSize="small"
        workspaceUuid="workspace-1"
      />
    );

    expect(MemoizedMarkdownSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        className: "chat-copy",
        content: "**hello**",
        parseIncompleteMarkdown: false,
        textSize: "small",
        workspaceUuid: "workspace-1",
      }),
      undefined
    );
    expect(html).toContain("MARKDOWN_SURFACE");
  });
});
