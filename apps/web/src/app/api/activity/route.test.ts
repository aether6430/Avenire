import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWorkspaceContextForUserMock,
  listChatsForUserMock,
  listWorkspaceFilesMock,
} = vi.hoisted(() => ({
  getWorkspaceContextForUserMock: vi.fn(),
  listChatsForUserMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  listChatsForUser: listChatsForUserMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

const activityRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);
const activityRouteGetSource = readFileSync(
  resolve(import.meta.dirname, "activity-route-get.ts"),
  "utf8"
);
const activityRouteModelSource = readFileSync(
  resolve(import.meta.dirname, "activity-route-model.ts"),
  "utf8"
);

import { GET } from "./route";

describe("/api/activity route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    listChatsForUserMock.mockReset();
    listWorkspaceFilesMock.mockReset();
  });

  it("returns unauthorized when there is no active workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/activity?limit=6")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when workspace context lookup throws before activity queries run", async () => {
    getWorkspaceContextForUserMock.mockRejectedValue(
      new Error("activity context offline")
    );

    const response = await GET(
      new Request("http://localhost:3003/api/activity?limit=6")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "activity context offline",
    });
    expect(listChatsForUserMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
  });

  it("returns a mixed activity feed sorted by most recent update", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    listChatsForUserMock.mockResolvedValue([
      {
        createdAt: "2026-05-12T08:00:00.000Z",
        id: "chat-1",
        slug: "algebra",
        title: "Algebra drill",
        updatedAt: "2026-05-12T08:00:00.000Z",
      },
      {
        createdAt: "2026-05-12T07:00:00.000Z",
        id: "chat-2",
        slug: "history",
        title: "History summary",
        updatedAt: "2026-05-12T09:30:00.000Z",
      },
    ]);
    listWorkspaceFilesMock.mockResolvedValue([
      {
        createdAt: "2026-05-12T06:00:00.000Z",
        folderId: "folder-1",
        id: "file-1",
        isNote: false,
        name: "Lecture slides.pdf",
        updatedAt: "2026-05-12T10:00:00.000Z",
        workspaceId: "workspace-1",
      },
      {
        createdAt: "2026-05-12T05:00:00.000Z",
        folderId: "folder-2",
        id: "file-2",
        isNote: true,
        name: "Week 2 recap",
        updatedAt: "2026-05-12T05:00:00.000Z",
        workspaceId: "workspace-1",
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3003/api/activity?limit=3")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: [
        {
          action: "updated",
          createdAt: "2026-05-12T10:00:00.000Z",
          href: "/workspace/files/workspace-1/folder/folder-1?file=file-1",
          id: "file-file-1",
          title: "Lecture slides.pdf",
          type: "file",
        },
        {
          action: "updated",
          createdAt: "2026-05-12T09:30:00.000Z",
          href: "/workspace/chats/history",
          id: "chat-chat-2",
          title: "History summary",
          type: "chat",
        },
        {
          action: "created",
          createdAt: "2026-05-12T08:00:00.000Z",
          href: "/workspace/chats/algebra",
          id: "chat-chat-1",
          title: "Algebra drill",
          type: "chat",
        },
      ],
    });
    expect(listChatsForUserMock).toHaveBeenCalledWith("user-1", "workspace-1");
    expect(listWorkspaceFilesMock).toHaveBeenCalledWith(
      "workspace-1",
      "user-1"
    );
  });

  it("falls back to the default limit for invalid values and caps oversized limits", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const manyChats = Array.from({ length: 60 }, (_, index) => ({
      createdAt: `2026-05-12T10:${String(index).padStart(2, "0")}:00.000Z`,
      id: `chat-${index}`,
      slug: `chat-${index}`,
      title: `Chat ${index}`,
      updatedAt: `2026-05-12T10:${String(index).padStart(2, "0")}:00.000Z`,
    }));
    listChatsForUserMock.mockResolvedValue(manyChats);
    listWorkspaceFilesMock.mockResolvedValue([]);

    let response = await GET(
      new Request("http://localhost:3003/api/activity?limit=garbage")
    );
    let data = (await response.json()) as { events: unknown[] };
    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(10);

    response = await GET(
      new Request("http://localhost:3003/api/activity?limit=999")
    );
    data = (await response.json()) as { events: unknown[] };
    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(50);
  });

  it("fails closed with an explicit load error when activity queries throw", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    listChatsForUserMock.mockRejectedValue(new Error("activity offline"));

    const response = await GET(
      new Request("http://localhost:3003/api/activity?limit=6")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "activity offline",
    });
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
  });

  it("keeps the activity route wrapper aligned to its dedicated query handler boundary", () => {
    expect(activityRouteSource).toContain("./activity-route-get");
    expect(activityRouteSource).toContain("./activity-route-model");
    expect(activityRouteSource).toContain("return await handleActivityGet");
    expect(activityRouteSource).not.toContain("listChatsForUser(");
    expect(activityRouteSource).not.toContain("listWorkspaceFiles(");

    expect(activityRouteGetSource).toContain("listChatsForUser");
    expect(activityRouteGetSource).toContain("listWorkspaceFiles");
    expect(activityRouteModelSource).toContain("resolveActivityRouteLimit");
    expect(activityRouteModelSource).toContain("sortActivityEvents");
  });
});
