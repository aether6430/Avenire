import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useTasksWorkspaceMock, useWorkspaceBootstrapMock } = vi.hoisted(() => ({
  useTasksWorkspaceMock: vi.fn(),
  useWorkspaceBootstrapMock: vi.fn(),
}));

vi.mock("@/components/tasks/use-tasks-workspace", () => ({
  useTasksWorkspace: useTasksWorkspaceMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderActions: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderLeadingIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/tasks/task-empty-state", () => ({
  TaskEmptyState: () => <div>TASK_EMPTY_STATE</div>,
}));

vi.mock("@/components/tasks/task-filters", () => ({
  TaskFilters: () => <div>TASK_FILTERS</div>,
}));

vi.mock("@/components/tasks/task-kanban-pane", () => ({
  TaskKanbanPane: () => <div>TASK_KANBAN</div>,
}));

vi.mock("@/components/tasks/task-list-pane", () => ({
  TaskListPane: () => <div>TASK_LIST</div>,
}));

vi.mock("@/components/tasks/task-mobile-sheet", () => ({
  TaskMobileSheet: () => <div>TASK_SHEET</div>,
}));

import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";

const removedWrapperFile = resolve(
  import.meta.dirname,
  "./tasks-workspace.tsx"
);
const removedSurfaceFile = resolve(
  import.meta.dirname,
  "./tasks-workspace-surface.tsx"
);
const tasksWorkspaceSource = resolve(
  import.meta.dirname,
  "./workspace-tasks-page-client.tsx"
);

describe("WorkspaceTasksPageClient ready branch", () => {
  it("wires the tasks runtime hook into the surface without the old exported wrapper file", () => {
    useWorkspaceBootstrapMock.mockReturnValue({
      status: "ready",
      user: {
        email: "ada@avenire.local",
        id: "user-1",
        image: null,
        name: "Ada",
      },
      workspace: {
        workspaceId: "workspace-1",
      },
    });
    useTasksWorkspaceMock.mockReturnValue({
      assigneeFilter: "all",
      draft: null,
      dropStatus: null,
      draggedTaskId: null,
      errorMessage: null,
      groupedTasks: [],
      grouping: "status",
      handleCreateTask: () => {},
      handleDelete: async () => {},
      handleDragEndTask: () => {},
      handleDragStartTask: () => {},
      handleDropStatus: async () => {},
      handleReset: () => {},
      handleSave: async () => {},
      handleSelectTask: () => {},
      handleSheetOpenChange: () => {},
      isDirty: false,
      isSaving: false,
      kanbanGroups: [],
      loadFailed: false,
      loading: false,
      members: [],
      mode: "idle",
      searchQuery: "",
      selectedTask: null,
      selectedTaskId: null,
      setAssigneeFilter: () => {},
      setDraft: () => {},
      setDropStatus: () => {},
      setGrouping: () => {},
      setSearchQuery: () => {},
      setStatusFilter: () => {},
      setViewMode: () => {},
      sheetOpen: false,
      statusFilter: "all",
      tasks: [],
      toggleTaskComplete: async () => {},
      viewMode: "list",
      workspaceId: "workspace-1",
    });

    const html = renderToStaticMarkup(<WorkspaceTasksPageClient />);

    expect(useTasksWorkspaceMock).toHaveBeenCalledWith({
      currentUserAvatar: undefined,
      currentUserEmail: "ada@avenire.local",
      currentUserId: "user-1",
      currentUserName: "Ada",
      workspaceId: "workspace-1",
    });
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(existsSync(removedSurfaceFile)).toBe(false);
    expect(html).toContain("TASK_EMPTY_STATE");
    expect(html).toContain("TASK_FILTERS");
  });
});
