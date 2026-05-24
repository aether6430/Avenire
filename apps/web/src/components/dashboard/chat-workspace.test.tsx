import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useChatWorkspaceMock } = vi.hoisted(() => ({
  useChatWorkspaceMock: vi.fn(),
}));

vi.mock("@/components/dashboard/use-chat-workspace", () => ({
  useChatWorkspace: useChatWorkspaceMock,
}));

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderActions: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/chat/chat", () => ({
  Chat: () => <div>CHAT_SURFACE</div>,
}));

import { ChatWorkspace } from "@/components/dashboard/chat-workspace";

const chatWorkspaceSource = readFileSync(
  resolve(import.meta.dirname, "./chat-workspace.tsx"),
  "utf8"
);

describe("ChatWorkspace", () => {
  it("wires the chat workspace runtime directly in the owner file after removing the intermediate surface", () => {
    useChatWorkspaceMock.mockReturnValue({
      canShare: false,
      currentChatSlug: "chat-1",
      icon: null,
      isPending: false,
      isReadonly: false,
      isShareDialogOpen: false,
      resolvedInitialMessages: [],
      shareBusy: false,
      shareEmail: "",
      shareLink: null,
      shareStatus: null,
      shareSuggestions: [],
      title: "Method",
      workspaceUuid: "workspace-1",
    });

    const props = {
      chatSlug: "chat-1",
      chatTitle: "Method",
      initialMessages: [],
      workspaceUuid: "workspace-1",
    };

    const html = renderToStaticMarkup(<ChatWorkspace {...props} />);

    expect(useChatWorkspaceMock).toHaveBeenCalledWith(props);
    expect(chatWorkspaceSource).not.toContain(
      "@/components/dashboard/chat-workspace-surface"
    );
    expect(html).toContain("CHAT_SURFACE");
  });

  it("routes workspace methods through the core Gemini-backed chat model by default", () => {
    expect(chatWorkspaceSource).toContain('selectedModel="apollo-core"');
    expect(chatWorkspaceSource).not.toContain('selectedModel="apollo-apex"');
  });
});
