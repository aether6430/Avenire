import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTaskStoreSnapshotMock,
  subscribeToTaskStoreMock,
  useUserSettingsMock,
} = vi.hoisted(() => ({
  getTaskStoreSnapshotMock: vi.fn(),
  subscribeToTaskStoreMock: vi.fn(() => () => {}),
  useUserSettingsMock: vi.fn(() => ({
    settings: { completedTasksAtTop: true },
  })),
}));

vi.mock("@/lib/task-client-store", () => ({
  getTaskStoreSnapshot: getTaskStoreSnapshotMock,
  patchWorkspaceTask: vi.fn(),
  primeWorkspaceTaskStore: vi.fn(),
  reloadWorkspaceTasks: vi.fn(),
  removeWorkspaceTask: vi.fn(),
  setWorkspaceTaskError: vi.fn(),
  subscribeToTaskStore: subscribeToTaskStoreMock,
  upsertWorkspaceTask: vi.fn(),
}));

vi.mock("@/lib/user-settings-client", () => ({
  useUserSettings: useUserSettingsMock,
}));

vi.mock("@/components/dashboard/quick-capture-dialog", () => ({
  QuickCaptureDialog: () => <div data-quick-capture="1" />,
}));

import { DashboardTaskManager } from "./task-manager";

describe("DashboardTaskManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an explicit load failure instead of a calm empty due-tasks state", () => {
    getTaskStoreSnapshotMock.mockReturnValue({
      errorMessage: "Could not load tasks right now.",
      loadFailed: true,
      loading: false,
      tasks: [],
      workspaceUuid: "workspace-1",
    });

    const html = renderToStaticMarkup(
      <DashboardTaskManager currentUserId="user-1" workspaceId="workspace-1" />
    );

    expect(html).toContain("Unable to load tasks.");
    expect(html).toContain("Try again in a moment or refresh the workspace.");
    expect(html).not.toContain("No tasks due today");
  });
});
