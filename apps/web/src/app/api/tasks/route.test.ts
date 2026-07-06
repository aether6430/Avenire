import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createTaskForUserMock,
  getWorkspaceContextForUserMock,
  invalidateTaskListCacheMock,
  listTasksForUserMock,
} = vi.hoisted(() => ({
  createTaskForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateTaskListCacheMock: vi.fn(),
  listTasksForUserMock: vi.fn(),
}));

vi.mock("@avenire/database/task-data", () => ({
  createTaskForUser: createTaskForUserMock,
  listTasksForUser: listTasksForUserMock,
}));

vi.mock("@/lib/tasks-cache", () => ({
  createTaskListCacheKey: vi.fn(),
  getCachedTaskList: vi.fn(),
  getTaskListCacheVersion: vi.fn(),
  invalidateTaskListCache: invalidateTaskListCacheMock,
  setCachedTaskList: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postTask = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/tasks", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/tasks route", () => {
  beforeEach(() => {
    createTaskForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateTaskListCacheMock.mockReset();
    listTasksForUserMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects malformed task resources before creating a task", async () => {
    const response = await postTask({
      resources: [{ resourceType: "file", title: "Source" }],
      title: "Read source",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Title is required",
    });
    expect(createTaskForUserMock).not.toHaveBeenCalled();
    expect(invalidateTaskListCacheMock).not.toHaveBeenCalled();
  });
});
