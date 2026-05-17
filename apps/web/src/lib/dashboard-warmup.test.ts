import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  writeCachedChatsMock,
  writeCachedFlashcardSetsMock,
  writeCachedWorkspacesMock,
} = vi.hoisted(() => ({
  writeCachedChatsMock: vi.fn(),
  writeCachedFlashcardSetsMock: vi.fn(),
  writeCachedWorkspacesMock: vi.fn(),
}));

vi.mock("@/lib/dashboard-browser-cache", () => ({
  writeCachedChats: writeCachedChatsMock,
  writeCachedFlashcardSets: writeCachedFlashcardSetsMock,
  writeCachedWorkspaces: writeCachedWorkspacesMock,
}));

import {
  warmDashboardBackground,
  warmDashboardRoutes,
  warmWorkspaceSurface,
} from "./dashboard-warmup";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return {
    promise,
    resolve,
  };
}

function createJsonResponse(payload: unknown, ok = true) {
  return {
    json: vi.fn().mockResolvedValue(payload),
    ok,
  } as unknown as Response;
}

describe("dashboard warmup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      connection: {
        effectiveType: "4g",
        saveData: false,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("prefetches the canonical dashboard entry routes", () => {
    const prefetch = vi.fn();

    warmDashboardRoutes({ prefetch });

    expect(prefetch.mock.calls.map(([href]) => href)).toEqual([
      "/workspace/chats/new",
      "/workspace/flashcards",
      "/workspace/files",
    ]);
  });

  it("warms workspaces, chats, and flashcard sets when background warmup is allowed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            workspaces: [
              {
                name: "Aveniri",
                organizationId: "org-1",
                rootFolderId: "root-1",
                workspaceId: "workspace-1",
              },
            ],
          })
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            chats: [{ id: "chat-1", slug: "chat-1" }],
          })
        )
        .mockResolvedValueOnce(createJsonResponse(null, false))
    );

    await warmDashboardBackground({
      workspaceUuid: "workspace-1",
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/workspaces/list",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/chat/history",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/flashcards/sets",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(writeCachedWorkspacesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        workspaceId: "workspace-1",
      }),
    ]);
    expect(writeCachedChatsMock).toHaveBeenCalledWith("workspace-1", [
      expect.objectContaining({
        id: "chat-1",
      }),
    ]);
    expect(writeCachedFlashcardSetsMock).toHaveBeenCalledWith(
      "workspace-1",
      []
    );
  });

  it("deduplicates in-flight chat surface warmups for the same workspace", async () => {
    const workspacesDeferred = createDeferred<Response>();
    const chatsDeferred = createDeferred<Response>();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => workspacesDeferred.promise)
        .mockImplementationOnce(() => chatsDeferred.promise)
    );

    const first = warmWorkspaceSurface("chat", {
      workspaceUuid: "workspace-1",
    });
    const second = warmWorkspaceSurface("chat", {
      workspaceUuid: "workspace-1",
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    workspacesDeferred.resolve(
      createJsonResponse({
        workspaces: [],
      })
    );
    chatsDeferred.resolve(
      createJsonResponse({
        chats: [],
      })
    );

    await Promise.all([first, second]);
    expect(writeCachedWorkspacesMock).toHaveBeenCalledTimes(1);
    expect(writeCachedChatsMock).toHaveBeenCalledTimes(1);
  });

  it("only warms the workspace list for the files surface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          workspaces: [],
        })
      )
    );

    await warmWorkspaceSurface("files", {
      currentFolderId: "folder-1",
      rootFolderId: "root-1",
      workspaceUuid: "workspace-1",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/workspaces/list",
      expect.objectContaining({
        credentials: "same-origin",
      })
    );
    expect(writeCachedWorkspacesMock).toHaveBeenCalledWith([]);
    expect(writeCachedChatsMock).not.toHaveBeenCalled();
    expect(writeCachedFlashcardSetsMock).not.toHaveBeenCalled();
  });

  it("skips warmup entirely on data-saver connections", async () => {
    vi.stubGlobal("navigator", {
      connection: {
        effectiveType: "4g",
        saveData: true,
      },
    });
    vi.stubGlobal("fetch", vi.fn());

    await warmDashboardBackground({
      workspaceUuid: "workspace-1",
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(writeCachedWorkspacesMock).not.toHaveBeenCalled();
    expect(writeCachedChatsMock).not.toHaveBeenCalled();
    expect(writeCachedFlashcardSetsMock).not.toHaveBeenCalled();
  });
});
