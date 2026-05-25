import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatActions } from "./chat-actions";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    "aria-label": ariaLabel,
    children,
  }: {
    "aria-label"?: string;
    children?: ReactNode;
  }) => <button aria-label={ariaLabel}>{children}</button>,
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePaneRouter: () => ({
    push: () => {},
  }),
}));

describe("ChatActions", () => {
  it("names the icon-only message actions explicitly", () => {
    const html = renderToStaticMarkup(
      <ChatActions
        chatId="chat-1"
        message={{
          id: "message-1",
          parts: [{ text: "hello", type: "text" }],
          role: "assistant",
        }}
        onRegenerate={() => {}}
      />
    );

    expect(html).toContain('aria-label="Copy message"');
    expect(html).toContain('aria-label="Branch method"');
    expect(html).toContain('aria-label="Regenerate response"');
  });
});
