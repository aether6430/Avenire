import { describe, expect, it } from "vitest";
import {
  buildDueGroups,
  buildStatusGroups,
  buildTaskPayload,
  buildTasksWorkspaceRoute,
  filterWorkspaceTasks,
  getTasksWorkspaceSurfaceState,
  sameTaskDraft,
} from "@/components/tasks/tasks-workspace-model";
import type { TaskEditorDraft } from "@/components/tasks/types";

describe("tasks workspace model", () => {
  it("builds normalized task payloads and compares drafts safely", () => {
    const draft: TaskEditorDraft = {
      assigneeUserId: "user-1",
      description: "  Review the derivation  ",
      dueAt: "2026-05-13T23:59",
      priority: "high",
      resources: [],
      selectedAssignee: null,
      status: "planned",
      title: "  Mechanics review  ",
    };

    expect(buildTaskPayload(draft)).toMatchObject({
      assigneeUserId: "user-1",
      description: "Review the derivation",
      priority: "high",
      status: "planned",
      title: "Mechanics review",
    });
    expect(
      buildTaskPayload({
        ...draft,
        description: "   ",
        dueAt: "",
      })
    ).toMatchObject({
      description: null,
      dueAt: null,
    });

    expect(sameTaskDraft(draft, draft)).toBe(true);
    expect(
      sameTaskDraft(draft, {
        ...draft,
        title: "Different",
      })
    ).toBe(false);
  });

  it("filters tasks, groups them, and syncs the route task param", () => {
    const tasks = [
      {
        assignee: { email: "ada@example.com", name: "Ada" },
        assigneeUserId: "user-1",
        description: "Derive the equation",
        dueAt: "2026-05-13T12:00:00.000Z",
        id: "task-1",
        status: "planned",
        title: "Mechanics",
      },
      {
        assignee: { email: "grace@example.com", name: "Grace" },
        assigneeUserId: "user-2",
        description: "Polish the writeup",
        dueAt: null,
        id: "task-2",
        status: "drafting",
        title: "Writeup",
      },
      {
        assignee: { email: "ada@example.com", name: "Ada" },
        assigneeUserId: "user-1",
        description: "Done",
        dueAt: "2026-05-10T12:00:00.000Z",
        id: "task-3",
        status: "completed",
        title: "Archived",
      },
    ] as never[];

    const filtered = filterWorkspaceTasks({
      assigneeFilter: "user-1",
      query: "mechanics",
      statusFilter: "all",
      tasks,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("task-1");

    expect(buildStatusGroups(tasks).map((group) => group.key)).toEqual([
      "planned",
      "drafting",
      "polishing",
      "completed",
    ]);
    expect(buildDueGroups(tasks).map((group) => group.key)).toEqual([
      "overdue",
      "today",
      "upcoming",
      "no_date",
      "completed",
    ]);

    expect(
      buildTasksWorkspaceRoute({
        pathname: "/workspace/tasks",
        searchParams: "pane=1",
        taskId: "task-1",
      })
    ).toBe("/workspace/tasks?pane=1&task=task-1");
    expect(
      buildTasksWorkspaceRoute({
        pathname: "/workspace/tasks",
        searchParams: "task=task-1&pane=1",
        taskId: null,
      })
    ).toBe("/workspace/tasks?pane=1");
  });

  it("keeps tasks workspace loading, failure, and empty states distinct", () => {
    expect(
      getTasksWorkspaceSurfaceState({
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
      getTasksWorkspaceSurfaceState({
        errorMessage: "Could not load tasks right now.",
        loadFailed: true,
        loading: false,
        visibleTaskCount: 0,
      })
    ).toEqual({
      description: "Could not load tasks right now.",
      showSpinner: false,
      title: "Unable to load tasks.",
    });

    expect(
      getTasksWorkspaceSurfaceState({
        loadFailed: false,
        loading: false,
        visibleTaskCount: 0,
      })
    ).toEqual({
      description:
        "Try a different filter, or create the first task for this workspace.",
      showSpinner: false,
      title: "No tasks match this view",
    });

    expect(
      getTasksWorkspaceSurfaceState({
        loadFailed: false,
        loading: false,
        visibleTaskCount: 3,
      })
    ).toBeNull();
  });
});
