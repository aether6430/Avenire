import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteWorkspaceTaskRecord,
  saveWorkspaceTaskDraft,
  updateWorkspaceTaskStatus,
} from "@/components/tasks/tasks-workspace-client";

const tasksWorkspaceClientSource = readFileSync(
  resolve(import.meta.dirname, "tasks-workspace-client.ts"),
  "utf8"
);
const tasksWorkspaceModelSource = readFileSync(
  resolve(import.meta.dirname, "tasks-workspace-model.ts"),
  "utf8"
);

describe("tasks workspace client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates status and saves create/edit drafts through the task endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ task: { id: "task-1", status: "completed" } }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ task: { id: "task-2", status: "planned" } }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ task: { id: "task-2", status: "drafting" } }),
          { status: 200 }
        )
      );

    await expect(
      updateWorkspaceTaskStatus({
        status: "completed",
        taskId: "task-1",
      })
    ).resolves.toMatchObject({ id: "task-1", status: "completed" });

    await expect(
      saveWorkspaceTaskDraft({
        draft: {
          assigneeUserId: "user-1",
          description: "Review notes",
          dueAt: "",
          priority: "normal",
          resources: [],
          selectedAssignee: null,
          status: "planned",
          title: "Study",
        } as never,
        mode: "create",
        selectedTaskId: null,
      })
    ).resolves.toMatchObject({ id: "task-2", status: "planned" });

    await expect(
      saveWorkspaceTaskDraft({
        draft: {
          assigneeUserId: "user-1",
          description: "Polish notes",
          dueAt: "",
          priority: "normal",
          resources: [],
          selectedAssignee: null,
          status: "drafting",
          title: "Study",
        } as never,
        mode: "edit",
        selectedTaskId: "task-2",
      })
    ).resolves.toMatchObject({ id: "task-2", status: "drafting" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/tasks/task-1",
      expect.objectContaining({
        body: JSON.stringify({ status: "completed" }),
        method: "PATCH",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/tasks/task-2",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("deletes tasks through the delete endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(deleteWorkspaceTaskRecord("task-4")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-4", {
      method: "DELETE",
    });
  });

  it("keeps payload shaping in the shared tasks workspace model instead of the fetch client", () => {
    expect(tasksWorkspaceClientSource).toContain(
      "@/components/tasks/tasks-workspace-model"
    );
    expect(tasksWorkspaceClientSource).toContain(
      "buildTaskPayload(input.draft)"
    );
    expect(tasksWorkspaceClientSource).toContain("parseTaskWorkspaceResponse");
    expect(tasksWorkspaceClientSource).not.toContain(
      "title: draft.title.trim()"
    );
    expect(tasksWorkspaceClientSource).not.toContain(
      "description: draft.description.trim()"
    );
    expect(tasksWorkspaceModelSource).toContain(
      "export function buildTaskPayload"
    );
  });
});
