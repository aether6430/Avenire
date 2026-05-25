import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getWorkspaceTreePayload,
  loadWorkspaceTreePayload,
  resolveWorkspaceTreeClientError,
} from "@/lib/workspace-tree-client";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createJsonResponse(payload: unknown) {
  return {
    json: vi.fn().mockResolvedValue(payload),
    ok: true,
  } as unknown as Response;
}

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("workspace tree client", () => {
  it("deduplicates in-flight tree loads and writes them into the browser cache", async () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });

    const deferred = createDeferred<Response>();
    const fetchMock = vi.fn(() => deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const first = loadWorkspaceTreePayload("workspace-a");
    const second = loadWorkspaceTreePayload("workspace-a");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    deferred.resolve(
      createJsonResponse({
        files: [{ folderId: "folder-a", id: "file-a", name: "Welcome.md" }],
        folders: [{ id: "folder-a", name: "Docs", parentId: "root-a" }],
      })
    );

    await expect(first).resolves.toEqual({
      files: [{ folderId: "folder-a", id: "file-a", name: "Welcome.md" }],
      folders: [{ id: "folder-a", name: "Docs", parentId: "root-a" }],
    });
    await expect(second).resolves.toEqual({
      files: [{ folderId: "folder-a", id: "file-a", name: "Welcome.md" }],
      folders: [{ id: "folder-a", name: "Docs", parentId: "root-a" }],
    });

    expect(
      window.localStorage.getItem("avenire-workspace-tree-cache:v1:workspace-a")
    ).toContain('"id":"file-a"');
  });

  it("returns cached tree payloads without hitting the network when preferCache is enabled", async () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire-workspace-tree-cache:v1:workspace-b": JSON.stringify({
          cachedAt: Date.now(),
          files: [{ folderId: "folder-b", id: "file-b", name: "Cached.md" }],
          folders: [{ id: "folder-b", name: "Docs", parentId: "root-b" }],
        }),
      }),
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getWorkspaceTreePayload("workspace-b", { preferCache: true })
    ).resolves.toEqual({
      files: [{ folderId: "folder-b", id: "file-b", name: "Cached.md" }],
      folders: [{ id: "folder-b", name: "Docs", parentId: "root-b" }],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed with a readable error when the tree route returns a non-ok response", async () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ error: "tree backend offline" }),
        ok: false,
      })
    );

    await expect(loadWorkspaceTreePayload("workspace-c")).rejects.toThrow(
      "tree backend offline"
    );
    expect(
      resolveWorkspaceTreeClientError(new Error("tree backend offline"))
    ).toBe("tree backend offline");
  });
});
