import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ChatWorkspaceSurfaceMock, useChatWorkspaceMock } = vi.hoisted(() => ({
  ChatWorkspaceSurfaceMock: vi.fn(() => <div>CHAT_WORKSPACE_SURFACE</div>),
  useChatWorkspaceMock: vi.fn(),
}));

vi.mock("@/components/dashboard/chat-workspace-surface", () => ({
  ChatWorkspaceSurface: ChatWorkspaceSurfaceMock,
}));

vi.mock("@/components/dashboard/use-chat-workspace", () => ({
  useChatWorkspace: useChatWorkspaceMock,
}));

import { ChatWorkspace } from "@/components/dashboard/chat-workspace";

describe("ChatWorkspace", () => {
  it("wires the chat workspace runtime into the surface", () => {
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
    expect(ChatWorkspaceSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          currentChatSlug: "chat-1",
          title: "Method",
          workspaceUuid: "workspace-1",
        }),
      }),
      undefined
    );
    expect(html).toContain("CHAT_WORKSPACE_SURFACE");
  });
});
