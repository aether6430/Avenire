import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteTaskForUserMock,
  getTaskForUserMock,
  getWorkspaceContextForUserMock,
  invalidateTaskListCacheMock,
  updateTaskForUserMock,
} = vi.hoisted(() => ({
  deleteTaskForUserMock: vi.fn(),
  getTaskForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateTaskListCacheMock: vi.fn(),
  updateTaskForUserMock: vi.fn(),
}));

vi.mock("@avenire/database/task-data", () => ({
  deleteTaskForUser: deleteTaskForUserMock,
  getTaskForUser: getTaskForUserMock,
  updateTaskForUser: updateTaskForUserMock,
}));

vi.mock("@/lib/tasks-cache", () => ({
  invalidateTaskListCache: invalidateTaskListCacheMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { DELETE, GET, PATCH } from "./route";

describe("/api/tasks/[taskId] route", () => {
  beforeEach(() => {
    deleteTaskForUserMock.mockReset();
    getTaskForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateTaskListCacheMock.mockReset();
    updateTaskForUserMock.mockReset();
    invalidateTaskListCacheMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized from GET when there is no workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/tasks/task-1"),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { title: "Updated" },
      method: "PATCH" as const,
    },
    {
      body: undefined,
      method: "DELETE" as const,
    },
  ])("fails closed from $method when workspace context lookup throws before task route handling begins", async ({
    body,
    method,
  }) => {
    getWorkspaceContextForUserMock.mockRejectedValueOnce(
      new Error("task auth offline")
    );

    const response =
      method === "GET"
        ? await GET(new Request("http://localhost:3003/api/tasks/task-1"), {
            params: Promise.resolve({ taskId: "task-1" }),
          })
        : method === "PATCH"
          ? await PATCH(
              new Request("http://localhost:3003/api/tasks/task-1", {
                method: "PATCH",
                body: JSON.stringify(body),
              }),
              {
                params: Promise.resolve({ taskId: "task-1" }),
              }
            )
          : await DELETE(
              new Request("http://localhost:3003/api/tasks/task-1", {
                method: "DELETE",
              }),
              {
                params: Promise.resolve({ taskId: "task-1" }),
              }
            );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "task auth offline",
    });
    expect(getTaskForUserMock).not.toHaveBeenCalled();
    expect(updateTaskForUserMock).not.toHaveBeenCalled();
    expect(deleteTaskForUserMock).not.toHaveBeenCalled();
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });

  it("returns not found from GET when the task does not exist", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getTaskForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/tasks/task-1"),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
  });

  it("returns tasks from GET and invalidates cached task lists", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getTaskForUserMock.mockResolvedValue({ id: "task-1" });

    const response = await GET(
      new Request("http://localhost:3003/api/tasks/task-1"),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ task: { id: "task-1" } });
    expect(invalidateTaskListCacheMock).toHaveBeenCalledWith("workspace-1");
  });

  it("fails closed from GET when task loading throws", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getTaskForUserMock.mockRejectedValue(new Error("task load offline"));

    const response = await GET(
      new Request("http://localhost:3003/api/tasks/task-1"),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "task load offline",
    });
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });

  it("updates tasks from PATCH with normalized dueAt semantics", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    updateTaskForUserMock.mockResolvedValue({ id: "task-1" });

    const response = await PATCH(
      new Request("http://localhost:3003/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({
          dueAt: null,
          status: "completed",
        }),
      }),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ task: { id: "task-1" } });
    expect(updateTaskForUserMock).toHaveBeenCalledWith(
      "workspace-1",
      "task-1",
      {
        assigneeUserId: undefined,
        description: undefined,
        dueAt: null,
        priority: undefined,
        resources: undefined,
        status: "completed",
        title: undefined,
      }
    );
    expect(invalidateTaskListCacheMock).toHaveBeenCalledWith("workspace-1");
  });

  it("returns bad requests from PATCH when task updates fail", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    updateTaskForUserMock.mockRejectedValue(new Error("Nope"));

    const response = await PATCH(
      new Request("http://localhost:3003/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Nope" });
  });

  it("returns success from DELETE and invalidates cached task lists", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    deleteTaskForUserMock.mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost:3003/api/tasks/task-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(invalidateTaskListCacheMock).toHaveBeenCalledWith("workspace-1");
  });

  it("returns not found from DELETE when the task is missing", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    deleteTaskForUserMock.mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost:3003/api/tasks/task-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found" });
  });

  it("fails closed from DELETE when task deletion throws", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    deleteTaskForUserMock.mockRejectedValue(new Error("delete offline"));

    const response = await DELETE(
      new Request("http://localhost:3003/api/tasks/task-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ taskId: "task-1" }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "delete offline",
    });
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });
});
