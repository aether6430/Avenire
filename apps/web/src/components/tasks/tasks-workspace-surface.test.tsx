import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TasksWorkspaceSurface } from "@/components/tasks/tasks-workspace-surface";
import type { TasksWorkspaceRuntime } from "@/components/tasks/use-tasks-workspace";

vi.mock("@/components/dashboard/header-portal", () => ({
  HeaderActions: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderBreadcrumbs: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderLeadingIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
  HeaderTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function createRuntime(
  overrides: Partial<TasksWorkspaceRuntime> = {}
): TasksWorkspaceRuntime {
  return {
    assigneeFilter: "all",
    draft: null,
    dropStatus: null,
    draggedTaskId: null,
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
    ...overrides,
  } as unknown as TasksWorkspaceRuntime;
}

describe("TasksWorkspaceSurface", () => {
  it("renders an explicit task load failure instead of falling through to the empty filtered-view state", () => {
    const html = renderToStaticMarkup(
      <TasksWorkspaceSurface runtime={createRuntime({ loadFailed: true })} />
    );

    expect(html).toContain("Unable to load tasks.");
    expect(html).toContain("Try again in a moment or refresh the workspace.");
    expect(html).not.toContain("No tasks match this view");
  });

  it("keeps the task search field visible in the main workspace surface", () => {
    const html = renderToStaticMarkup(
      <TasksWorkspaceSurface runtime={createRuntime()} />
    );

    expect(html).toContain("Search Tasks...");
    expect(html).not.toContain("Search tasks...");
  });
});
