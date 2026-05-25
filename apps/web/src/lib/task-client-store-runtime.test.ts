import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceTask } from "@/lib/tasks";

const {
  readCachedTasksMock,
  toastErrorMock,
  writeCachedTasksMock,
  getUserSettingsSnapshotMock,
} = vi.hoisted(() => ({
  getUserSettingsSnapshotMock: vi.fn(),
  readCachedTasksMock: vi.fn(),
  toastErrorMock: vi.fn(),
  writeCachedTasksMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/lib/dashboard-browser-cache", () => ({
  readCachedTasks: readCachedTasksMock,
  writeCachedTasks: writeCachedTasksMock,
}));

vi.mock("@/lib/user-settings-client", () => ({
  getUserSettingsSnapshot: getUserSettingsSnapshotMock,
}));

function buildTask(
  overrides: Partial<WorkspaceTask> & Pick<WorkspaceTask, "id">
): WorkspaceTask {
  return {
    assignee: null,
    createdAt: "2026-05-17T10:00:00.000Z",
    createdBy: "user-1",
    dueAt: null,
    id: overrides.id,
    priority: "normal",
    resources: [],
    status: "planned",
    title: overrides.id,
    updatedAt: "2026-05-17T10:00:00.000Z",
    userId: "user-1",
    workspaceId: "workspace-1",
    ...overrides,
  } as WorkspaceTask;
}

const taskClientStoreBarrelSource = readFileSync(
  resolve(import.meta.dirname, "task-client-store.ts"),
  "utf8"
);
const taskClientStoreRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "task-client-store-runtime.ts"),
  "utf8"
);
const taskClientStoreModelSource = readFileSync(
  resolve(import.meta.dirname, "task-client-store-model.ts"),
  "utf8"
);

async function loadRuntime() {
  return import("@/lib/task-client-store-runtime");
}

describe("task client store runtime", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    readCachedTasksMock.mockReset();
    toastErrorMock.mockReset();
    writeCachedTasksMock.mockReset();
    getUserSettingsSnapshotMock.mockReset();
    getUserSettingsSnapshotMock.mockReturnValue({
      settings: {
        completedTasksAtTop: false,
      },
    });
  });

  it("primes from cache, sorts tasks, and notifies subscribers", async () => {
    readCachedTasksMock.mockReturnValue([
      buildTask({
        id: "completed",
        status: "completed",
      }),
      buildTask({
        dueAt: "2026-05-17T09:00:00.000Z",
        id: "planned",
      }),
    ]);
    const runtime = await loadRuntime();
    const listener = vi.fn();

    const unsubscribe = runtime.subscribeToTaskStore(listener);
    runtime.primeWorkspaceTaskStore("workspace-1");

    expect(runtime.getTaskStoreSnapshot()).toMatchObject({
      loading: false,
      tasks: [
        expect.objectContaining({ id: "planned" }),
        expect.objectContaining({ id: "completed" }),
      ],
      workspaceUuid: "workspace-1",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("reloads tasks from the api and writes the sorted cache snapshot", async () => {
    readCachedTasksMock.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          tasks: [
            buildTask({
              id: "completed",
              status: "completed",
            }),
            buildTask({
              dueAt: "2026-05-17T09:00:00.000Z",
              id: "planned",
            }),
          ],
        }),
        ok: true,
      })
    );

    const runtime = await loadRuntime();
    await runtime.reloadWorkspaceTasks("workspace-1");

    expect(writeCachedTasksMock).toHaveBeenCalledWith("workspace-1", [
      expect.objectContaining({ id: "planned" }),
      expect.objectContaining({ id: "completed" }),
    ]);
    expect(runtime.getTaskStoreSnapshot()).toMatchObject({
      errorMessage: null,
      loadFailed: false,
      loading: false,
      workspaceUuid: "workspace-1",
    });
  });

  it("surfaces reload failures through the store and toast", async () => {
    readCachedTasksMock.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const runtime = await loadRuntime();
    await runtime.reloadWorkspaceTasks("workspace-1");

    expect(runtime.getTaskStoreSnapshot()).toMatchObject({
      errorMessage: "Could not load tasks right now.",
      loadFailed: true,
      loading: false,
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Could not load tasks right now."
    );
  });

  it("patches, upserts, removes, and errors against the active workspace snapshot", async () => {
    readCachedTasksMock.mockReturnValue([buildTask({ id: "task-1" })]);
    const runtime = await loadRuntime();

    runtime.primeWorkspaceTaskStore("workspace-1");
    runtime.patchWorkspaceTask("workspace-1", "task-1", (task) => ({
      ...task,
      title: "Updated task",
    }));
    runtime.upsertWorkspaceTask(
      "workspace-1",
      buildTask({
        id: "task-2",
        dueAt: "2026-05-17T08:00:00.000Z",
      })
    );
    runtime.removeWorkspaceTask("workspace-1", "task-1");
    runtime.setWorkspaceTaskError("Save failed.");

    expect(writeCachedTasksMock).toHaveBeenCalledTimes(3);
    expect(runtime.getTaskStoreSnapshot()).toMatchObject({
      errorMessage: "Save failed.",
      loadFailed: false,
      tasks: [expect.objectContaining({ id: "task-2" })],
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Save failed.");
  });

  it("keeps the task store split between a thin barrel, pure snapshot model, and runtime side effects", () => {
    expect(taskClientStoreBarrelSource).toContain(
      "@/lib/task-client-store-model"
    );
    expect(taskClientStoreBarrelSource).toContain(
      "@/lib/task-client-store-runtime"
    );
    expect(taskClientStoreBarrelSource).not.toContain("toast.error");
    expect(taskClientStoreBarrelSource).not.toContain('fetch("/api/tasks');
    expect(taskClientStoreBarrelSource).not.toContain("readCachedTasks(");

    expect(taskClientStoreRuntimeSource).toContain("readCachedTasks");
    expect(taskClientStoreRuntimeSource).toContain("writeCachedTasks");
    expect(taskClientStoreRuntimeSource).toContain("toast.error");
    expect(taskClientStoreRuntimeSource).toContain(
      'fetch("/api/tasks?includeCompleted=true"'
    );
    expect(taskClientStoreRuntimeSource).toContain("applyTaskStoreError");

    expect(taskClientStoreModelSource).toContain(
      "export function createPrimedTaskStoreSnapshot"
    );
    expect(taskClientStoreModelSource).toContain(
      "export function applyPatchedTaskToSnapshot"
    );
    expect(taskClientStoreModelSource).not.toContain("toast.error");
    expect(taskClientStoreModelSource).not.toContain('fetch("/api/tasks');
  });
});
