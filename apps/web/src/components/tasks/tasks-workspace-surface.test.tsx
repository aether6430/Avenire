import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TasksWorkspaceRuntime } from "@/components/tasks/use-tasks-workspace";
import { TasksWorkspaceSurface } from "@/components/tasks/workspace-tasks-page-client";

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
    ...overrides,
  } as unknown as TasksWorkspaceRuntime;
}

const taskDetailPaneFile = path.resolve(
  import.meta.dirname,
  "./task-detail-pane.tsx"
);
const taskMobileSheetFile = path.resolve(
  import.meta.dirname,
  "./task-mobile-sheet.tsx"
);

describe("TasksWorkspaceSurface", () => {
  it("renders an explicit task load failure instead of falling through to the empty filtered-view state", () => {
    const html = renderToStaticMarkup(
      <TasksWorkspaceSurface
        runtime={createRuntime({
          errorMessage: "Could not load tasks right now.",
          loadFailed: true,
        })}
      />
    );

    expect(html).toContain("Unable to load tasks.");
    expect(html).toContain("Could not load tasks right now.");
    expect(html).not.toContain("No tasks match this view");
  });

  it("renders an explicit filtered empty-state message when no tasks match the current view", () => {
    const html = renderToStaticMarkup(
      <TasksWorkspaceSurface runtime={createRuntime({ tasks: [] })} />
    );

    expect(html).toContain("No tasks match this view");
    expect(html).toContain(
      "Try a different filter, or create the first task for this workspace."
    );
    expect(html).not.toContain("Loading tasks...");
  });

  it("keeps the task search field visible in the main workspace surface", () => {
    const html = renderToStaticMarkup(
      <TasksWorkspaceSurface runtime={createRuntime()} />
    );

    expect(html).toContain("Search Tasks...");
    expect(html).not.toContain("Search tasks...");
    expect(html).not.toContain(
      "Assigned, scheduled, and in progress across the current workspace."
    );
  });

  it("keeps the task editor headings aligned between the sheet shell and the detail pane", () => {
    const taskDetailPaneSource = readFileSync(taskDetailPaneFile, "utf8");
    const taskMobileSheetSource = readFileSync(taskMobileSheetFile, "utf8");

    expect(taskDetailPaneSource).toContain('"New Task"');
    expect(taskDetailPaneSource).toContain('"Task Details"');
    expect(taskDetailPaneSource).not.toContain('"New task"');
    expect(taskDetailPaneSource).not.toContain('"Task details"');
    expect(taskMobileSheetSource).toContain('"New Task"');
    expect(taskMobileSheetSource).toContain('"Task Details"');
  });
});
