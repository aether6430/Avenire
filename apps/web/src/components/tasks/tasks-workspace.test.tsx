import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { TasksWorkspaceSurfaceMock, useTasksWorkspaceMock } = vi.hoisted(() => ({
  TasksWorkspaceSurfaceMock: vi.fn(() => <div>TASKS_SURFACE</div>),
  useTasksWorkspaceMock: vi.fn(),
}));

vi.mock("@/components/tasks/tasks-workspace-surface", () => ({
  TasksWorkspaceSurface: TasksWorkspaceSurfaceMock,
}));

vi.mock("@/components/tasks/use-tasks-workspace", () => ({
  useTasksWorkspace: useTasksWorkspaceMock,
}));

import { TasksWorkspace } from "@/components/tasks/tasks-workspace";

describe("TasksWorkspace", () => {
  it("wires the workspace runtime hook into the tasks surface", () => {
    useTasksWorkspaceMock.mockReturnValue({
      loadFailed: false,
      loading: false,
      tasks: [],
    });

    const html = renderToStaticMarkup(
      <TasksWorkspace
        currentUserId="user-1"
        currentUserName="Ada"
        workspaceId="workspace-1"
      />
    );

    expect(useTasksWorkspaceMock).toHaveBeenCalledWith({
      currentUserId: "user-1",
      currentUserName: "Ada",
      workspaceId: "workspace-1",
    });
    expect(TasksWorkspaceSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          loadFailed: false,
          loading: false,
          tasks: [],
        }),
      }),
      undefined
    );
    expect(html).toContain("TASKS_SURFACE");
  });
});
