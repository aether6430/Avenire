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

import WorkspaceChatsPage, { metadata } from "./page";

describe("WorkspaceChatsPage", () => {
  it("keeps page metadata aligned to the live Methods product surface", () => {
    expect(metadata.title).toBe("Methods — Avenire");
  });

  it("renders the shared new-method client behind the loading placeholder", () => {
    const element = WorkspaceChatsPage();

    expect(element.type).toBe(Suspense);
    expect(element.props.children.type).toBe(workspaceChatNewPageClientMock);
    expect(element.props.children.props).toEqual({});
    expect(element.props.fallback.type).toBe(workspaceRoutePlaceholderMock);
    expect(element.props.fallback.props).toEqual({
      label: "Loading Method...",
    });
  });
});
