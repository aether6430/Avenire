import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTaskStoreSnapshotMock,
  patchWorkspaceTaskMock,
  primeWorkspaceTaskStoreMock,
  reloadWorkspaceTasksMock,
  removeWorkspaceTaskMock,
  setWorkspaceTaskErrorMock,
  subscribeToTaskStoreMock,
  upsertWorkspaceTaskMock,
  useUserSettingsMock,
} = vi.hoisted(() => ({
  getTaskStoreSnapshotMock: vi.fn(),
  patchWorkspaceTaskMock: vi.fn(),
  primeWorkspaceTaskStoreMock: vi.fn(),
  reloadWorkspaceTasksMock: vi.fn(),
  removeWorkspaceTaskMock: vi.fn(),
  setWorkspaceTaskErrorMock: vi.fn(),
  subscribeToTaskStoreMock: vi.fn(() => () => {}),
  upsertWorkspaceTaskMock: vi.fn(),
  useUserSettingsMock: vi.fn(() => ({
    settings: { completedTasksAtTop: false },
  })),
}));

vi.mock("@/lib/task-client-store", () => ({
  getTaskStoreSnapshot: getTaskStoreSnapshotMock,
  patchWorkspaceTask: patchWorkspaceTaskMock,
  primeWorkspaceTaskStore: primeWorkspaceTaskStoreMock,
  reloadWorkspaceTasks: reloadWorkspaceTasksMock,
  removeWorkspaceTask: removeWorkspaceTaskMock,
  setWorkspaceTaskError: setWorkspaceTaskErrorMock,
  subscribeToTaskStore: subscribeToTaskStoreMock,
  upsertWorkspaceTask: upsertWorkspaceTaskMock,
}));

vi.mock("@/lib/user-settings-client", () => ({
  useUserSettings: useUserSettingsMock,
}));

import { useDashboardTaskManager } from "@/components/dashboard/use-dashboard-task-manager";

type HookValue = ReturnType<typeof useDashboardTaskManager>;

function renderHookValue(
  options: Parameters<typeof useDashboardTaskManager>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDashboardTaskManager(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

function buildTask(overrides: Record<string, unknown>) {
  return {
    completedAt: null,
    dueAt: "2026-05-17T12:00:00.000Z",
    id: "task-1",
    status: "planned",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

describe("useDashboardTaskManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTaskStoreSnapshotMock.mockReturnValue({
      loadFailed: false,
      loading: false,
      tasks: [
        buildTask({ id: "task-1", dueAt: "2026-05-17T08:00:00.000Z" }),
        buildTask({
          id: "task-2",
          dueAt: "2026-05-17T18:00:00.000Z",
          status: "completed",
        }),
        buildTask({ id: "task-3", dueAt: null }),
      ],
    });
  });

  it("filters due-today tasks and patches optimistic completion on success", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          task: buildTask({
            completedAt: "2026-05-17T12:00:00.000Z",
            id: "task-1",
            status: "completed",
          }),
        }),
        { status: 200 }
      )
    );

    const hook = renderHookValue({ workspaceId: "workspace-1" });
    expect(hook.displayTasks.map((task) => task.id)).toEqual([
      "task-1",
      "task-2",
    ]);
    expect(hook.pendingCount).toBe(1);

    await hook.handleToggleTask(buildTask({ id: "task-1" }));

    expect(patchWorkspaceTaskMock).toHaveBeenNthCalledWith(
      1,
      "workspace-1",
      "task-1",
      expect.any(Function)
    );
    const optimisticUpdater = patchWorkspaceTaskMock.mock.calls[0]?.[2] as (
      task: ReturnType<typeof buildTask>
    ) => ReturnType<typeof buildTask>;
    expect(optimisticUpdater(buildTask({ id: "task-1" }))).toMatchObject({
      completedAt: "2026-05-17T12:00:00.000Z",
      status: "completed",
    });
    expect(upsertWorkspaceTaskMock).toHaveBeenCalledWith(
      "workspace-1",
      expect.objectContaining({
        completedAt: "2026-05-17T12:00:00.000Z",
        id: "task-1",
        status: "completed",
      })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-1", {
      body: JSON.stringify({ status: "completed" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    expect(reloadWorkspaceTasksMock).toHaveBeenCalledWith("workspace-1", {
      background: true,
    });
    vi.useRealTimers();
  });

  it("rolls back toggle failures and restores deleted tasks on delete failure", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Failed to update task." }), {
          status: 500,
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    const task = buildTask({ id: "task-1" });
    const hook = renderHookValue({ workspaceId: "workspace-1" });

    await hook.handleToggleTask(task);
    expect(upsertWorkspaceTaskMock).toHaveBeenCalledWith("workspace-1", task);
    expect(setWorkspaceTaskErrorMock).toHaveBeenCalledWith(
      "Failed to update task."
    );

    await hook.handleDeleteTask(task);
    expect(removeWorkspaceTaskMock).toHaveBeenCalledWith(
      "workspace-1",
      "task-1"
    );
    expect(upsertWorkspaceTaskMock).toHaveBeenCalledWith("workspace-1", task);
    expect(setWorkspaceTaskErrorMock).toHaveBeenCalledWith(
      "Failed to delete task."
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/tasks/task-1", {
      method: "DELETE",
    });
  });
});
