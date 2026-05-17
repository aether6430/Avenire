import { describe, expect, it } from "vitest";
import {
  getDashboardDisplayTasks,
  getDashboardTaskManagerState,
} from "./dashboard-task-manager-model";

describe("dashboard task manager model", () => {
  it("keeps loading, load failure, and empty due-task states distinct", () => {
    expect(
      getDashboardTaskManagerState({
        loadFailed: false,
        loading: true,
        visibleTaskCount: 0,
      })
    ).toEqual({
      description: null,
      showSpinner: true,
      title: "Loading tasks...",
    });

    expect(
      getDashboardTaskManagerState({
        loadFailed: true,
        loading: false,
        visibleTaskCount: 0,
      })
    ).toEqual({
      description: "Try again in a moment or refresh the workspace.",
      showSpinner: false,
      title: "Unable to load tasks.",
    });

    expect(
      getDashboardTaskManagerState({
        loadFailed: false,
        loading: false,
        visibleTaskCount: 0,
      })
    ).toEqual({
      description:
        "Capture a task with a due date of today and it will show up here with quick edit and completion controls.",
      showSpinner: false,
      title: "No tasks due today",
    });

    expect(
      getDashboardTaskManagerState({
        loadFailed: false,
        loading: false,
        visibleTaskCount: 2,
      })
    ).toBeNull();
  });

  it("filters due-today tasks for the active workspace and sorts completion placement", () => {
    const tasks = [
      {
        dueAt: "2026-05-17T08:00:00.000Z",
        id: "planned-early",
        status: "planned",
        workspaceId: "workspace-1",
      },
      {
        dueAt: "2026-05-17T18:00:00.000Z",
        id: "completed-late",
        status: "completed",
        workspaceId: "workspace-1",
      },
      {
        dueAt: "2026-05-18T12:00:00.000Z",
        id: "tomorrow",
        status: "planned",
        workspaceId: "workspace-1",
      },
      {
        dueAt: "2026-05-17T09:00:00.000Z",
        id: "other-workspace",
        status: "planned",
        workspaceId: "workspace-2",
      },
    ] as never[];

    expect(
      getDashboardDisplayTasks({
        completedTasksAtTop: false,
        now: new Date("2026-05-17T12:00:00.000Z"),
        tasks,
        workspaceId: "workspace-1",
      }).map((task) => task.id)
    ).toEqual(["planned-early", "completed-late"]);

    expect(
      getDashboardDisplayTasks({
        completedTasksAtTop: true,
        now: new Date("2026-05-17T12:00:00.000Z"),
        tasks,
        workspaceId: "workspace-1",
      }).map((task) => task.id)
    ).toEqual(["completed-late", "planned-early"]);
  });
});
