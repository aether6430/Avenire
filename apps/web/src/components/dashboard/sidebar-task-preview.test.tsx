import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTaskStoreSnapshotMock, subscribeToTaskStoreMock } = vi.hoisted(
  () => ({
    getTaskStoreSnapshotMock: vi.fn(),
    subscribeToTaskStoreMock: vi.fn(() => () => {}),
  })
);

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/task-client-store", () => ({
  getTaskStoreSnapshot: getTaskStoreSnapshotMock,
  sortWorkspaceTasks: (tasks: unknown[]) => tasks,
  subscribeToTaskStore: subscribeToTaskStoreMock,
}));

import { SidebarTaskPreview } from "./sidebar-task-preview";

describe("SidebarTaskPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an explicit task load failure instead of due/upcoming empty-state copy", () => {
    getTaskStoreSnapshotMock.mockReturnValue({
      errorMessage: "Could not load tasks right now.",
      loadFailed: true,
      loading: false,
      tasks: [],
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <SidebarTaskPreview
        activeWorkspaceId="workspace-1"
        closeMobileSidebar={() => {}}
        navigate={() => {}}
      />
    );

    expect(html).toContain("Unable to load tasks.");
    expect(html).not.toContain("Nothing is due right now.");
    expect(html).not.toContain("No upcoming tasks have due dates yet.");
  });

  it("exposes explicit sidebar action labels for searching tasks and creating a task", () => {
    getTaskStoreSnapshotMock.mockReturnValue({
      errorMessage: null,
      loadFailed: false,
      loading: false,
      tasks: [],
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <SidebarTaskPreview
        activeWorkspaceId="workspace-1"
        closeMobileSidebar={() => {}}
        navigate={() => {}}
      />
    );

    expect(html).toContain('aria-label="Search Tasks"');
    expect(html).toContain('aria-label="New Task"');
  });

  it("renders task section headings in Title Case when due and upcoming tasks exist", () => {
    getTaskStoreSnapshotMock.mockReturnValue({
      errorMessage: null,
      loadFailed: false,
      loading: false,
      tasks: [
        {
          assignee: { email: null, name: "Ada" },
          description: null,
          dueAt: "2026-05-15T08:00:00.000Z",
          id: "task-1",
          status: "planned",
          title: "Due item",
          workspaceId: "workspace-1",
        },
        {
          assignee: { email: null, name: "Ada" },
          description: null,
          dueAt: "2099-05-15T08:00:00.000Z",
          id: "task-2",
          status: "planned",
          title: "Upcoming item",
          workspaceId: "workspace-1",
        },
      ],
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <SidebarTaskPreview
        activeWorkspaceId="workspace-1"
        closeMobileSidebar={() => {}}
        navigate={() => {}}
      />
    );

    expect(html).toContain("Due Tasks");
    expect(html).toContain("Upcoming Tasks");
    expect(html).toContain("Search Tasks...");
  });
});
