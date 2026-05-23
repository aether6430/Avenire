import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatListSection } from "./dashboard-sidebar-chat-list-section";

const baseProps = {
  activeChatSlug: "",
  chatActionStatus: null,
  chatsErrorMessage: null,
  editingChatSlug: null,
  editingTitle: "",
  onCancelRename: () => {},
  onDelete: () => {},
  onEditingTitleChange: () => {},
  onFinishRename: () => {},
  onSelect: () => {},
  onSelectInNewPane: () => {},
  onStartRename: () => {},
  onTogglePin: () => {},
  otherChats: [],
  pendingChatSlug: null,
  pinnedChats: [],
};

describe("ChatListSection", () => {
  it("renders an explicit loading state while chats are still resolving", () => {
    const html = renderToStaticMarkup(
      <ChatListSection {...baseProps} chatsLoading />
    );

    expect(html).toContain("Loading methods...");
    expect(html).not.toContain("No methods yet");
  });

  it("renders an explicit failure state when chats cannot be loaded", () => {
    const html = renderToStaticMarkup(
      <ChatListSection
        {...baseProps}
        chatsErrorMessage="chat history offline"
        chatsLoadFailed
      />
    );

    expect(html).toContain("Unable to load methods.");
    expect(html).toContain("chat history offline");
    expect(html).not.toContain("No methods yet");
  });

  it("renders explicit sidebar chat action feedback", () => {
    const html = renderToStaticMarkup(
      <ChatListSection
        {...baseProps}
        chatActionStatus="Unable to update Method."
      />
    );

    expect(html).toContain("Unable to update Method.");
  });
});
