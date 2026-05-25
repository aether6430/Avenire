import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";

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

describe("resolveWorkspaceFileRoute", () => {
  it("resolves path-like identifiers from cached tree data without refetching the tree", async () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire-workspace-tree-cache:v1:workspace-a": JSON.stringify({
          cachedAt: Date.now(),
          files: [{ folderId: "folder-a", id: "file-a", name: "Welcome.md" }],
          folders: [
            { id: "root-a", name: "Workspace", parentId: null },
            { id: "folder-a", name: "Docs", parentId: "root-a" },
          ],
        }),
      }),
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveWorkspaceFileRoute("workspace-a", "Docs/Welcome.md")
    ).resolves.toBe("/workspace/files/workspace-a/folder/folder-a?file=file-a");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a fresh tree load when the cached tree is stale for a workspace path", async () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock({
        "avenire-workspace-tree-cache:v1:workspace-a": JSON.stringify({
          cachedAt: Date.now(),
          files: [{ folderId: "folder-a", id: "file-old", name: "Old.md" }],
          folders: [
            { id: "root-a", name: "Workspace", parentId: null },
            { id: "folder-a", name: "Docs", parentId: "root-a" },
          ],
        }),
      }),
    });

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        files: [{ folderId: "folder-a", id: "file-a", name: "Welcome.md" }],
        folders: [
          { id: "root-a", name: "Workspace", parentId: null },
          { id: "folder-a", name: "Docs", parentId: "root-a" },
        ],
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveWorkspaceFileRoute("workspace-a", "Docs/Welcome.md")
    ).resolves.toBe("/workspace/files/workspace-a/folder/folder-a?file=file-a");
    expect(fetchMock).toHaveBeenCalledWith("/api/workspaces/workspace-a/tree", {
      cache: "no-store",
    });
  });
});
