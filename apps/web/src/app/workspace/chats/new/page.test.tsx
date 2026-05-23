import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const { workspaceChatNewPageClientMock, workspaceRoutePlaceholderMock } =
  vi.hoisted(() => ({
    workspaceChatNewPageClientMock: vi.fn(() => null),
    workspaceRoutePlaceholderMock: vi.fn(() => null),
  }));

vi.mock("@/components/dashboard/workspace-chat-new-page-client", () => ({
  WorkspaceChatNewPageClient: workspaceChatNewPageClientMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

import WorkspaceChatsNewPage, { metadata } from "./page";

describe("WorkspaceChatsNewPage", () => {
  it("keeps page metadata aligned to the new-method surface", () => {
    expect(metadata.title).toBe("New Method — Avenire");
  });

  it("renders the new-method client behind a loading fallback", () => {
    const element = WorkspaceChatsNewPage();

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(workspaceChatNewPageClientMock);
    expect(element.props.children.props).toEqual({
      allowPrompt: true,
    });
    expect(element.props.fallback.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props.fallback.props).toEqual({
      label: "Loading Method...",
    });
  });
});
