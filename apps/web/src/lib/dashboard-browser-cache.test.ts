import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readCachedChats,
  readCachedFlashcardSets,
  readCachedTasks,
  readCachedWorkspaces,
  writeCachedChats,
  writeCachedFlashcardSets,
  writeCachedTasks,
  writeCachedWorkspaces,
} from "@/lib/dashboard-browser-cache";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { WorkspaceTask } from "@/lib/tasks";

function createLocalStorageMock(
  initialEntries: Record<string, string> = {}
): Storage {
  const store = new Map(Object.entries(initialEntries));

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

function buildChat(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: "2026-05-18T10:00:00.000Z",
    id: "chat-1",
    lastMessageAt: "2026-05-18T11:00:00.000Z",
    slug: "chat-1",
    title: "Momentum Review",
    updatedAt: "2026-05-18T11:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  } as never;
}

function buildFlashcardSet(
  overrides: Record<string, unknown> = {}
): FlashcardSetSummary {
  return {
    createdAt: "2026-05-18T09:00:00.000Z",
    id: "set-1",
    title: "Week 1",
    updatedAt: "2026-05-18T10:00:00.000Z",
    ...overrides,
  } as FlashcardSetSummary;
}

function buildTask(
  overrides: Partial<WorkspaceTask> & Pick<WorkspaceTask, "id">
): WorkspaceTask {
  return {
    assignee: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    createdBy: "user-1",
    dueAt: null,
    id: overrides.id,
    priority: "normal",
    resources: [],
    status: "planned",
    title: "Review task",
    updatedAt: "2026-05-18T10:00:00.000Z",
    userId: "user-1",
    workspaceId: "workspace-1",
    ...overrides,
  } as WorkspaceTask;
}

describe("dashboard browser cache", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });
    vi.spyOn(Date, "now").mockReturnValue(123_456_789);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("writes and reads namespaced chat, flashcard, task, and workspace payloads", () => {
    const chats = [buildChat()];
    const sets = [buildFlashcardSet()];
    const tasks = [buildTask({ id: "task-1" })];
    const workspaces = [
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];

    writeCachedChats("workspace-1", chats);
    writeCachedFlashcardSets("workspace-1", sets);
    writeCachedTasks("workspace-1", tasks);
    writeCachedWorkspaces(workspaces);

    expect(
      JSON.parse(
        window.localStorage.getItem("avenire:chats:workspace-1") ?? "null"
      )
    ).toEqual({
      cachedAt: 123_456_789,
      items: chats,
      workspaceUuid: "workspace-1",
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("avenire:flashcards:workspace-1") ?? "null"
      )
    ).toEqual({
      cachedAt: 123_456_789,
      items: sets,
      workspaceUuid: "workspace-1",
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("avenire:tasks:workspace-1") ?? "null"
      )
    ).toEqual({
      cachedAt: 123_456_789,
      items: tasks,
      workspaceUuid: "workspace-1",
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("avenire:workspaces:list") ?? "null"
      )
    ).toEqual({
      cachedAt: 123_456_789,
      workspaces,
    });

    expect(readCachedChats("workspace-1")).toEqual(chats);
    expect(readCachedFlashcardSets("workspace-1")).toEqual(sets);
    expect(readCachedTasks("workspace-1")).toEqual(tasks);
    expect(readCachedWorkspaces()).toEqual(workspaces);
  });

  it("keeps workspace-scoped caches isolated from each other", () => {
    writeCachedChats("workspace-1", [buildChat({ id: "chat-1", slug: "one" })]);
    writeCachedChats("workspace-2", [buildChat({ id: "chat-2", slug: "two" })]);

    expect(readCachedChats("workspace-1")).toEqual([
      buildChat({ id: "chat-1", slug: "one" }),
    ]);
    expect(readCachedChats("workspace-2")).toEqual([
      buildChat({ id: "chat-2", slug: "two" }),
    ]);
  });

  it("fails closed for malformed cached payloads", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire:chats:workspace-1": JSON.stringify({
          cachedAt: 123_456_789,
          items: [
            {
              createdAt: "2026-05-18T10:00:00.000Z",
              id: "chat-1",
              lastMessageAt: "2026-05-18T11:00:00.000Z",
              title: "Missing slug",
              updatedAt: "2026-05-18T11:00:00.000Z",
              workspaceId: "workspace-1",
            },
          ],
          workspaceUuid: "workspace-1",
        }),
        "avenire:flashcards:workspace-1": JSON.stringify({
          cachedAt: 123_456_789,
          items: [
            {
              createdAt: "2026-05-18T09:00:00.000Z",
              id: "set-1",
              title: "Missing updatedAt",
            },
          ],
          workspaceUuid: "workspace-1",
        }),
        "avenire:tasks:workspace-1": JSON.stringify({
          cachedAt: 123_456_789,
          items: [
            {
              assignee: {
                userId: "user-1",
              },
              createdAt: "2026-05-18T09:00:00.000Z",
              createdBy: "user-1",
              id: "task-1",
              status: "planned",
              title: "Broken task",
              updatedAt: "2026-05-18T10:00:00.000Z",
              userId: "user-1",
              workspaceId: "workspace-1",
            },
          ],
          workspaceUuid: "workspace-1",
        }),
        "avenire:workspaces:list": JSON.stringify({
          cachedAt: 123_456_789,
          workspaces: [
            {
              name: "Broken workspace",
              organizationId: "org-1",
              workspaceId: "workspace-1",
            },
          ],
        }),
      }),
    });

    expect(readCachedChats("workspace-1")).toBeNull();
    expect(readCachedFlashcardSets("workspace-1")).toBeNull();
    expect(readCachedTasks("workspace-1")).toBeNull();
    expect(readCachedWorkspaces()).toBeNull();
  });
});
