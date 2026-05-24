import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  chatWorkspaceMock,
  usePanePathnameMock,
  usePaneRouterMock,
  usePaneSearchParamsMock,
  useChatMessageHandoffStoreMock,
  useQueryMock,
  useSearchParamsMock,
  useWorkspaceBootstrapMock,
  workspaceRoutePlaceholderMock,
} = vi.hoisted(() => ({
  chatWorkspaceMock: vi.fn((props: { chatSlug?: string; chatTitle?: string }) =>
    createElement("div", {
      "data-chat-slug": props.chatSlug ?? "",
      "data-chat-title": props.chatTitle ?? "",
    })
  ),
  usePanePathnameMock: vi.fn(() => "/workspace/chats/example-method"),
  usePaneRouterMock: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
  usePaneSearchParamsMock: vi.fn(() => new URLSearchParams()),
  useChatMessageHandoffStoreMock: vi.fn((selector: (state: any) => unknown) =>
    selector({
      messagesByChatId: {},
    })
  ),
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

vi.mock("@/components/dashboard/dashboard-home-surface", () => ({
  DashboardHomeSurface: () => createElement("div"),
}));

vi.mock("@/components/dashboard/use-dashboard-home", () => ({
  useDashboardHome: () => ({
    greeting: { description: "desc", headline: "headline" },
    weakPointGroups: [],
  }),
}));

vi.mock("@/components/tasks/use-tasks-workspace", () => ({
  useTasksWorkspace: () => ({
    loadFailed: false,
    loading: false,
    tasks: [],
  }),
}));

vi.mock("@/components/dashboard/chat-workspace", () => ({
  ChatWorkspace: chatWorkspaceMock,
}));

vi.mock("@/components/flashcards/use-flashcards-dashboard", () => ({
  useFlashcardsDashboard: () => ({
    busy: false,
    orderedSets: [],
    reviewTarget: null,
    selectedSet: null,
  }),
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePanePathname: usePanePathnameMock,
  usePaneRouter: usePaneRouterMock,
  usePaneSearchParams: usePaneSearchParamsMock,
}));

vi.mock("@/stores/chat-message-handoff-store", () => ({
  useChatMessageHandoffStore: useChatMessageHandoffStoreMock,
}));

import { WorkspaceChatNewPageClient } from "@/components/dashboard/workspace-chat-new-page-client";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";

const workspaceOverviewPageClientSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-overview-page-client.tsx"),
  "utf8"
);

describe("workspace no-workspace state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePanePathnameMock.mockReturnValue("/workspace/chats/example-method");
    usePaneRouterMock.mockReturnValue({ replace: vi.fn(), push: vi.fn() });
    usePaneSearchParamsMock.mockReturnValue(new URLSearchParams());
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useChatMessageHandoffStoreMock.mockImplementation(
      (selector: (state: any) => unknown) =>
        selector({
          messagesByChatId: {},
        })
    );
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

  it("renders the chat workspace immediately for a pending chat route when handoff messages already exist", () => {
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
      isError: false,
      isPending: true,
    });
    useChatMessageHandoffStoreMock.mockImplementation(
      (selector: (state: any) => unknown) =>
        selector({
          messagesByChatId: {
            "method-1": [{ id: "message-1", role: "user" }],
          },
        })
    );

    const html = renderToStaticMarkup(
      createElement(WorkspaceChatRoutePageClient, { slug: "method-1" })
    );

    expect(html).toContain('data-chat-slug="method-1"');
    expect(html).toContain('data-chat-title="New Method"');
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

  it("shows title-cased Method loading placeholders while workspace bootstrap is still pending", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "loading",
      user: null,
      workspace: null,
      workspaces: [],
    });

    const html = [
      renderToStaticMarkup(
        createElement(WorkspaceChatNewPageClient, { allowPrompt: true })
      ),
      renderToStaticMarkup(
        createElement(WorkspaceChatRoutePageClient, { slug: "method-1" })
      ),
    ].join("\n");

    expect(html).toContain('data-label="Loading Method..."');
    expect(html).not.toContain('data-label="Loading method..."');
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
    expect(html).toContain('data-label="Unable to load Method."');
    expect(html).toContain('data-label="Unable to load Mindset Sets."');
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
    useQueryMock
      .mockReturnValueOnce({
        data: undefined,
        error: new Error("overview backend offline"),
        isError: true,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error("chat route offline"),
        isError: true,
        isPending: false,
      })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error("flashcards dashboard offline"),
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

    expect(html).toContain('data-label="overview backend offline"');
    expect(html).toContain('data-label="chat route offline"');
    expect(html).toContain('data-label="flashcards dashboard offline"');
    expect(html).toContain('data-pending="false"');
  });

  it("shows an explicit non-loading unavailable state when the flashcards dashboard resolves to null", () => {
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
      data: null,
      isError: false,
      isPending: false,
    });

    const html = renderToStaticMarkup(
      createElement(WorkspaceFlashcardsPageClient)
    );

    expect(html).toContain('data-label="Mindset Sets unavailable."');
    expect(html).toContain('data-pending="false"');
  });

  it("keeps the overview page client on bootstrap/query orchestration with a deferred home surface", () => {
    expect(workspaceOverviewPageClientSource).toContain(
      "@/components/dashboard/workspace-bootstrap"
    );
    expect(workspaceOverviewPageClientSource).toContain("useQuery");
    expect(workspaceOverviewPageClientSource).toContain(
      "@/components/dashboard/dashboard-home-surface"
    );
    expect(workspaceOverviewPageClientSource).toContain("useDashboardHome(");
    expect(workspaceOverviewPageClientSource).not.toContain(
      '@/components/dashboard/dashboard-home"'
    );
    expect(workspaceOverviewPageClientSource).toContain(
      'label="Loading workspace..."'
    );
    expect(workspaceOverviewPageClientSource).toContain(
      "overviewQuery.error instanceof Error"
    );
    expect(workspaceOverviewPageClientSource).not.toContain(
      "getWeakestConcepts("
    );
    expect(workspaceOverviewPageClientSource).not.toContain(
      "getActiveMisconceptions("
    );
    expect(workspaceOverviewPageClientSource).not.toContain(
      "listFlashcardSetSummariesForUser("
    );
  });
});
