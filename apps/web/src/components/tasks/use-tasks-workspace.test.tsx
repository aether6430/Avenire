import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTaskStoreSnapshotMock,
  primeWorkspaceTaskStoreMock,
  reloadWorkspaceTasksMock,
  replaceMock,
  subscribeToTaskStoreMock,
  updateWorkspaceTaskStatusWithRollbackMock,
  usePaneWorkspaceHistoryActionsMock,
  usePanePathnameMock,
  usePaneRouterMock,
  usePaneSearchParamsMock,
  useUserSettingsMock,
} = vi.hoisted(() => ({
  getTaskStoreSnapshotMock: vi.fn(),
  primeWorkspaceTaskStoreMock: vi.fn(),
  reloadWorkspaceTasksMock: vi.fn(),
  replaceMock: vi.fn(),
  subscribeToTaskStoreMock: vi.fn(() => () => {}),
  updateWorkspaceTaskStatusWithRollbackMock: vi.fn(),
  usePanePathnameMock: vi.fn(() => "/workspace/tasks"),
  usePaneRouterMock: vi.fn(),
  usePaneSearchParamsMock: vi.fn(() => new URLSearchParams("pane=1")),
  usePaneWorkspaceHistoryActionsMock: vi.fn(() => ({
    recordRoute: vi.fn(),
  })),
  useUserSettingsMock: vi.fn(() => ({
    settings: { completedTasksAtTop: true },
  })),
}));

vi.mock("@/lib/task-client-store", () => ({
  getTaskStoreSnapshot: getTaskStoreSnapshotMock,
  patchWorkspaceTask: vi.fn(),
  primeWorkspaceTaskStore: primeWorkspaceTaskStoreMock,
  reloadWorkspaceTasks: reloadWorkspaceTasksMock,
  removeWorkspaceTask: vi.fn(),
  setWorkspaceTaskError: vi.fn(),
  subscribeToTaskStore: subscribeToTaskStoreMock,
  upsertWorkspaceTask: vi.fn(),
}));

vi.mock("@/lib/user-settings-client", () => ({
  useUserSettings: useUserSettingsMock,
}));

vi.mock("@/lib/workspace-panes", () => ({
  usePanePathname: usePanePathnameMock,
  usePaneRouter: usePaneRouterMock,
  usePaneSearchParams: usePaneSearchParamsMock,
}));

vi.mock("@/stores/workspaceHistoryStore", () => ({
  usePaneWorkspaceHistoryActions: usePaneWorkspaceHistoryActionsMock,
}));

vi.mock("@/components/tasks/tasks-mutation-runtime", () => ({
  deleteWorkspaceTaskWithRollback: vi.fn(),
  updateWorkspaceTaskStatusWithRollback:
    updateWorkspaceTaskStatusWithRollbackMock,
}));

const useTasksWorkspaceSource = readFileSync(
  resolve(import.meta.dirname, "use-tasks-workspace.ts"),
  "utf8"
);
const tasksWorkspaceModelSource = readFileSync(
  resolve(import.meta.dirname, "tasks-workspace-model.ts"),
  "utf8"
);
const tasksWorkspaceRuntimeModelSource = readFileSync(
  resolve(import.meta.dirname, "tasks-workspace-runtime-model.ts"),
  "utf8"
);
const taskClientStoreBarrelSource = readFileSync(
  resolve(import.meta.dirname, "../../lib/task-client-store.ts"),
  "utf8"
);

import { useTasksWorkspace } from "@/components/tasks/use-tasks-workspace";

type HookValue = ReturnType<typeof useTasksWorkspace>;

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    assignee: null,
    assigneeUserId: "user-1",
    completedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    createdBy: "user-1",
    description: null,
    dueAt: "2026-05-18T12:00:00.000Z",
    id: "task-1",
    priority: "normal",
    resources: [],
    status: "planned",
    title: "Study",
    updatedAt: "2026-05-18T08:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

function renderHookValue(
  options: Parameters<typeof useTasksWorkspace>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useTasksWorkspace(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useTasksWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePaneRouterMock.mockReturnValue({ replace: replaceMock });
    reloadWorkspaceTasksMock.mockResolvedValue(undefined);
    getTaskStoreSnapshotMock.mockReturnValue({
      loadFailed: false,
      loading: false,
      tasks: [
        buildTask({ id: "task-1", title: "Planned task" }),
        buildTask({
          id: "task-2",
          status: "completed",
          title: "Completed task",
        }),
        buildTask({
          id: "task-3",
          title: "Other workspace task",
          workspaceId: "workspace-2",
        }),
      ],
    });
    updateWorkspaceTaskStatusWithRollbackMock.mockResolvedValue(null);
  });

  it("filters tasks to the active workspace and syncs route params for select/create flows", () => {
    const hook = renderHookValue({
      currentUserId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(hook.tasks.map((task) => task.id)).toEqual(["task-1", "task-2"]);
    expect(hook.groupedTasks.map((group) => group.key)).toEqual([
      "planned",
      "drafting",
      "polishing",
      "completed",
    ]);

    hook.handleSelectTask("task-1");
    expect(replaceMock).toHaveBeenCalledWith(
      "/workspace/tasks?pane=1&task=task-1",
      {
        scroll: false,
      }
    );

    hook.handleCreateTask();
    expect(replaceMock).toHaveBeenLastCalledWith("/workspace/tasks?pane=1", {
      scroll: false,
    });
  });

  it("delegates completion mutations and avoids redundant drop-status moves", async () => {
    const hook = renderHookValue({
      currentUserId: "user-1",
      workspaceId: "workspace-1",
    });

    await hook.toggleTaskComplete(
      buildTask({ id: "task-1", status: "planned" })
    );
    expect(updateWorkspaceTaskStatusWithRollbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStatus: "completed",
        task: expect.objectContaining({ id: "task-1" }),
        workspaceId: "workspace-1",
      })
    );

    await hook.handleDropStatus("task-2", "completed");
    expect(updateWorkspaceTaskStatusWithRollbackMock).toHaveBeenCalledTimes(1);

    await hook.handleDropStatus("task-1", "completed");
    expect(updateWorkspaceTaskStatusWithRollbackMock).toHaveBeenCalledTimes(2);
  });

  it("clears the task route param when closing the sheet", () => {
    usePaneSearchParamsMock.mockReturnValue(
      new URLSearchParams("pane=1&task=task-1")
    );

    const hook = renderHookValue({
      currentUserId: "user-1",
      workspaceId: "workspace-1",
    });

    hook.handleSheetOpenChange(false);
    expect(replaceMock).toHaveBeenCalledWith("/workspace/tasks?pane=1", {
      scroll: false,
    });
  });

  it("keeps only the priming load effect and does not reintroduce a duplicate mount reload", () => {
    expect(useTasksWorkspaceSource).toContain(
      "primeWorkspaceTaskStore(workspaceId);"
    );
    expect(useTasksWorkspaceSource).toContain(
      "void reloadWorkspaceTasks(workspaceId);"
    );
    expect(useTasksWorkspaceSource).not.toContain(
      `useEffect(() => {
    void reloadWorkspaceTasks(workspaceId, { background: true });
  }, [workspaceId]);`
    );
  });

  it("keeps the tasks hook composed from split workspace models, mutations, and store modules", () => {
    expect(useTasksWorkspaceSource).toContain(
      "@/components/tasks/tasks-workspace-model"
    );
    expect(useTasksWorkspaceSource).toContain(
      "@/components/tasks/tasks-workspace-runtime-model"
    );
    expect(useTasksWorkspaceSource).toContain(
      "@/components/tasks/tasks-mutation-runtime"
    );
    expect(useTasksWorkspaceSource).toContain("@/lib/task-client-store");
    expect(useTasksWorkspaceSource).toContain("buildGroupedTasks");
    expect(useTasksWorkspaceSource).toContain(
      "resolveTasksWorkspaceCreateState"
    );
    expect(useTasksWorkspaceSource).toContain("reloadWorkspaceTasks");
    expect(useTasksWorkspaceSource).not.toContain('fetch("/api/tasks');
    expect(useTasksWorkspaceSource).not.toContain("readCachedTasks(");
    expect(useTasksWorkspaceSource).not.toContain("writeCachedTasks(");

    expect(tasksWorkspaceModelSource).toContain(
      "export function buildGroupedTasks"
    );
    expect(tasksWorkspaceRuntimeModelSource).toContain(
      "export function resolveTasksWorkspaceCreateState"
    );
    expect(taskClientStoreBarrelSource).toContain("export {");
    expect(taskClientStoreBarrelSource).toContain(
      'from "@/lib/task-client-store-runtime"'
    );
  });
});
