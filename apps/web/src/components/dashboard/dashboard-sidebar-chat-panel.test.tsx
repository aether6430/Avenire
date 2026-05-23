import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardSidebarChatPanel } from "./dashboard-sidebar-chat-panel";

const baseProps = {
  activeChatSlug: "",
  chatActionStatus: null,
  chatsErrorMessage: null,
  chatSearchQuery: "",
  editingChatSlug: null,
  editingTitle: "",
  isSearchOpen: false,
  onCancelRename: () => {},
  onCreateChat: () => {},
  onDelete: () => {},
  onEditingTitleChange: () => {},
  onFinishRename: () => {},
  onSelect: () => {},
  onSelectInNewPane: () => {},
  onStartRename: () => {},
  onToggleSearch: () => {},
  onTogglePin: () => {},
  onUpdateChatSearchQuery: () => {},
  otherChats: [],
  pendingChatSlug: null,
  pinnedChats: [],
};

describe("DashboardSidebarChatPanel", () => {
  it("renders the methods chrome around explicit chat load failures", () => {
    const html = renderToStaticMarkup(
      <DashboardSidebarChatPanel
        {...baseProps}
        chatsErrorMessage="chat history offline"
        chatsLoadFailed
      />
    );

    expect(html).toContain("Methods");
    expect(html).toContain("Unable to load methods.");
    expect(html).toContain("chat history offline");
    expect(html).not.toContain("No methods yet");
  });

  it("surfaces explicit chat action status inside the panel", () => {
    const html = renderToStaticMarkup(
      <DashboardSidebarChatPanel
        {...baseProps}
        chatActionStatus="Unable to update Method."
      />
    );

    expect(html).toContain("Unable to update Method.");
  });

  it("only renders the local methods search field when search is open", () => {
    const closedHtml = renderToStaticMarkup(
      <DashboardSidebarChatPanel {...baseProps} />
    );
    const openHtml = renderToStaticMarkup(
      <DashboardSidebarChatPanel {...baseProps} isSearchOpen />
    );

    expect(closedHtml).not.toContain("Search Methods...");
    expect(openHtml).toContain("Search Methods...");
  });
});
