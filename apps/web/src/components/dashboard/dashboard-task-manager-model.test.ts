import { describe, expect, it } from "vitest";
import { getDashboardTaskManagerState } from "./dashboard-task-manager-model";

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
});
