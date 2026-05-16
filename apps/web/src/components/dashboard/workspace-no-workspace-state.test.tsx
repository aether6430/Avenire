import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  usePanePathnameMock,
  usePaneRouterMock,
  usePaneSearchParamsMock,
  useQueryMock,
  useSearchParamsMock,
  useWorkspaceBootstrapMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  usePanePathnameMock: vi.fn(() => "/workspace/chats/example-method"),
  usePaneRouterMock: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
  usePaneSearchParamsMock: vi.fn(() => new URLSearchParams()),
  useQueryMock: vi.fn<() => any>(() => ({
    data: undefined,
    isError: false,
    isPending: false,
  })),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
  useWorkspaceBootstrapMock: vi.fn<() => any>(() => ({
    status: "ready",
    user: {
      email: "dev@avenire.local",
      id: "user-1",
      image: null,
      name: "Dev User",
    },
    workspace: null,
    workspaces: [],
  })),
  workspaceRoutePlaceholderMock: vi.fn(
    ({ label, pending }: { label?: string; pending?: boolean }) =>
      createElement("div", {
        "data-label": label ?? "Loading workspace...",
        "data-pending": String(pending ?? true),
      })
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

vi.mock("@/components/dashboard/workspace-route-placeholder", () => ({
  WorkspaceRoutePlaceholder: workspaceRoutePlaceholderMock,
}));

vi.mock("@/components/dashboard/dashboard-home", () => ({
  DashboardHome: () => createElement("div"),
}));

vi.mock("@/components/tasks/tasks-workspace", () => ({
  TasksWorkspace: () => createElement("div"),
}));

vi.mock("@/components/dashboard/chat-workspace", () => ({
  ChatWorkspace: () => createElement("div"),
}));

vi.mock("@/components/flashcards/dashboard", () => ({
  FlashcardsDashboard: () => createElement("div"),
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePanePathname: usePanePathnameMock,
  usePaneRouter: usePaneRouterMock,
  usePaneSearchParams: usePaneSearchParamsMock,
}));

import { WorkspaceChatNewPageClient } from "@/components/dashboard/workspace-chat-new-page-client";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";

describe("workspace no-workspace state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePanePathnameMock.mockReturnValue("/workspace/chats/example-method");
    usePaneRouterMock.mockReturnValue({ replace: vi.fn(), push: vi.fn() });
    usePaneSearchParamsMock.mockReturnValue(new URLSearchParams());
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useQueryMock.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: false,
    });
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: null,
        name: "Dev User",
      },
      workspace: null,
      workspaces: [],
    });
  });

  it("shows an explicit non-loading placeholder across core workspace roots", () => {
    const expectedLabel = "Create a workspace to continue.";

    const html = [
      renderToStaticMarkup(createElement(WorkspaceOverviewPageClient)),
      renderToStaticMarkup(createElement(WorkspaceTasksPageClient)),
      renderToStaticMarkup(
        createElement(WorkspaceChatNewPageClient, { allowPrompt: true })
      ),
      renderToStaticMarkup(
        createElement(WorkspaceChatRoutePageClient, { slug: "method-1" })
      ),
      renderToStaticMarkup(createElement(WorkspaceFlashcardsPageClient)),
    ].join("\n");

    expect(html).toContain(`data-label="${expectedLabel}"`);
    expect(html).toContain('data-pending="false"');
    expect(workspaceRoutePlaceholderMock).toHaveBeenCalledTimes(5);
  });

  it("shows explicit non-loading error placeholders when workspace bootstrap fails", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "error",
      user: null,
      workspace: null,
      workspaces: [],
    });

    const html = [
      renderToStaticMarkup(createElement(WorkspaceOverviewPageClient)),
      renderToStaticMarkup(createElement(WorkspaceTasksPageClient)),
      renderToStaticMarkup(
        createElement(WorkspaceChatNewPageClient, { allowPrompt: true })
      ),
      renderToStaticMarkup(
        createElement(WorkspaceChatRoutePageClient, { slug: "method-1" })
      ),
      renderToStaticMarkup(createElement(WorkspaceFlashcardsPageClient)),
    ].join("\n");

    expect(html).toContain('data-label="Unable to load workspace."');
    expect(html).toContain('data-label="Unable to load tasks."');
    expect(html).toContain('data-label="Unable to load method."');
    expect(html).toContain('data-label="Unable to load mindset sets."');
    expect(html).toContain('data-pending="false"');
  });

  it("shows explicit non-loading query-error placeholders on overview, chat route, and flashcards roots", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      user: {
        email: "dev@avenire.local",
        id: "user-1",
        image: null,
        name: "Dev User",
      },
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      workspaces: [],
    });
    useQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
    });

    const html = [
      renderToStaticMarkup(createElement(WorkspaceOverviewPageClient)),
      renderToStaticMarkup(
        createElement(WorkspaceChatRoutePageClient, { slug: "method-1" })
      ),
      renderToStaticMarkup(createElement(WorkspaceFlashcardsPageClient)),
    ].join("\n");

    expect(html).toContain('data-label="Unable to load workspace."');
    expect(html).toContain('data-label="Unable to load method."');
    expect(html).toContain('data-label="Unable to load mindset sets."');
    expect(html).toContain('data-pending="false"');
  });
});
