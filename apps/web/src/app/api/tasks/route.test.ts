import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createTaskForUserMock,
  createTaskListCacheKeyMock,
  getCachedTaskListMock,
  getTaskListCacheVersionMock,
  getWorkspaceContextForUserMock,
  invalidateTaskListCacheMock,
  listTasksForUserMock,
  setCachedTaskListMock,
} = vi.hoisted(() => ({
  createTaskForUserMock: vi.fn(),
  createTaskListCacheKeyMock: vi.fn(),
  getCachedTaskListMock: vi.fn(),
  getTaskListCacheVersionMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateTaskListCacheMock: vi.fn(),
  listTasksForUserMock: vi.fn(),
  setCachedTaskListMock: vi.fn(),
}));

vi.mock("@avenire/database/task-data", () => ({
  createTaskForUser: createTaskForUserMock,
  listTasksForUser: listTasksForUserMock,
}));

vi.mock("@/lib/tasks-cache", () => ({
  createTaskListCacheKey: createTaskListCacheKeyMock,
  getCachedTaskList: getCachedTaskListMock,
  getTaskListCacheVersion: getTaskListCacheVersionMock,
  invalidateTaskListCache: invalidateTaskListCacheMock,
  setCachedTaskList: setCachedTaskListMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { GET, POST } from "./route";

describe("/api/tasks route", () => {
  beforeEach(() => {
    createTaskForUserMock.mockReset();
    createTaskListCacheKeyMock.mockReset();
    getCachedTaskListMock.mockReset();
    getTaskListCacheVersionMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateTaskListCacheMock.mockReset();
    listTasksForUserMock.mockReset();
    setCachedTaskListMock.mockReset();

    createTaskListCacheKeyMock.mockReturnValue("tasks-cache-key");
    getTaskListCacheVersionMock.mockResolvedValue("v1");
    invalidateTaskListCacheMock.mockResolvedValue(undefined);
    setCachedTaskListMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized from GET when there is no workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/tasks?status=planned")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(getTaskListCacheVersionMock).not.toHaveBeenCalled();
    expect(createTaskListCacheKeyMock).not.toHaveBeenCalled();
    expect(getCachedTaskListMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { title: "Do it" },
      method: "POST" as const,
    },
  ])("fails closed from $method when workspace context lookup throws before tasks route handling begins", async ({
    body,
    method,
  }) => {
    getWorkspaceContextForUserMock.mockRejectedValueOnce(
      new Error("tasks auth offline")
    );

    const response =
      method === "GET"
        ? await GET(
            new Request("http://localhost:3003/api/tasks?status=planned")
          )
        : await POST(
            new Request("http://localhost:3003/api/tasks", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "tasks auth offline",
    });
    expect(getTaskListCacheVersionMock).not.toHaveBeenCalled();
    expect(createTaskForUserMock).not.toHaveBeenCalled();
    expect(listTasksForUserMock).not.toHaveBeenCalled();
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });

  it("returns cached task lists from GET with a hit header", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedTaskListMock.mockResolvedValue({
      tasks: [{ id: "task-1" }],
    });

    const response = await GET(
      new Request("http://localhost:3003/api/tasks?status=planned")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-tasks-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      tasks: [{ id: "task-1" }],
    });
    expect(listTasksForUserMock).not.toHaveBeenCalled();
    expect(setCachedTaskListMock).not.toHaveBeenCalled();
  });

  it("loads and caches task lists from GET on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedTaskListMock.mockResolvedValue(null);
    listTasksForUserMock.mockResolvedValue([{ id: "task-2" }]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/tasks?status=completed&includeCompleted=false&assigneeUserId=user-2&dueBefore=2026-05-20&limit=12"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-tasks-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      tasks: [{ id: "task-2" }],
    });
    expect(listTasksForUserMock).toHaveBeenCalledWith("workspace-1", {
      assigneeUserId: "user-2",
      dueBefore: new Date("2026-05-20"),
      includeCompleted: true,
      limit: 12,
      status: "completed",
    });
    expect(setCachedTaskListMock).toHaveBeenCalledWith("tasks-cache-key", {
      tasks: [{ id: "task-2" }],
    });
  });

  it("fails closed from GET when task list loading throws before cache fill", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedTaskListMock.mockResolvedValue(null);
    listTasksForUserMock.mockRejectedValue(new Error("tasks offline"));

    const response = await GET(
      new Request("http://localhost:3003/api/tasks?status=planned")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "tasks offline",
    });
    expect(setCachedTaskListMock).not.toHaveBeenCalled();
  });

  it("requires a title when creating tasks", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/tasks", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Title is required",
    });
  });

  it("creates tasks with normalized defaults and invalidates the task list cache", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createTaskForUserMock.mockResolvedValue({ id: "task-3" });

    const response = await POST(
      new Request("http://localhost:3003/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "  Finish docs  ",
          dueAt: "2026-05-20T12:00:00.000Z",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      task: { id: "task-3" },
    });
    expect(createTaskForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      {
        assigneeUserId: "user-1",
        description: null,
        dueAt: new Date("2026-05-20T12:00:00.000Z"),
        priority: "normal",
        resources: [],
        status: "planned",
        title: "Finish docs",
      }
    );
    expect(invalidateTaskListCacheMock).toHaveBeenCalledWith("workspace-1");
  });

  it("returns task creation failures as bad requests", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createTaskForUserMock.mockRejectedValue(new Error("Nope"));

    const response = await POST(
      new Request("http://localhost:3003/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Do it" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Nope" });
  });
});
