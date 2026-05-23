import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  TasksWorkspaceSurfaceMock,
  useTasksWorkspaceMock,
  useWorkspaceBootstrapMock,
} = vi.hoisted(() => ({
  TasksWorkspaceSurfaceMock: vi.fn(() => <div>TASKS_SURFACE</div>),
  useTasksWorkspaceMock: vi.fn(),
  useWorkspaceBootstrapMock: vi.fn(),
}));

vi.mock("@/components/tasks/tasks-workspace-surface", () => ({
  TasksWorkspaceSurface: TasksWorkspaceSurfaceMock,
}));

vi.mock("@/components/tasks/use-tasks-workspace", () => ({
  useTasksWorkspace: useTasksWorkspaceMock,
}));

vi.mock("@/components/dashboard/workspace-bootstrap", () => ({
  useWorkspaceBootstrap: useWorkspaceBootstrapMock,
}));

import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";

const removedWrapperFile = resolve(
  import.meta.dirname,
  "./tasks-workspace.tsx"
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
      loadFailed: false,
      loading: false,
      tasks: [],
    });

    const html = renderToStaticMarkup(<WorkspaceTasksPageClient />);

    expect(useTasksWorkspaceMock).toHaveBeenCalledWith({
      currentUserAvatar: undefined,
      currentUserEmail: "ada@avenire.local",
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
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("TASKS_SURFACE");
  });
});
