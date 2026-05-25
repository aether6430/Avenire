import { beforeEach, describe, expect, it, vi } from "vitest";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

async function loadStore() {
  return import("@/stores/commandPaletteStore");
}

describe("command palette store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  it("opens, closes, and records workspace file indexes through the zustand shell", async () => {
    const { commandPaletteActions, useCommandPaletteStore } = await loadStore();

    commandPaletteActions.open();
    commandPaletteActions.setFileIndex({
      files: [{ folderId: "folder-1", id: "file-1", name: "Plan.md" }],
      folders: [{ id: "folder-1", name: "Docs", parentId: "root-1" }],
      rootFolderId: "root-1",
      workspaceName: "Aveniri",
      workspaceUuid: "workspace-1",
    });
    commandPaletteActions.close();

    expect(useCommandPaletteStore.getState()).toMatchObject({
      fileIndexByWorkspace: {
        "workspace-1": {
          files: [{ folderId: "folder-1", id: "file-1", name: "Plan.md" }],
          folders: [{ id: "folder-1", name: "Docs", parentId: "root-1" }],
          rootFolderId: "root-1",
          workspaceName: "Aveniri",
        },
      },
      open: false,
      workspaceUuid: "workspace-1",
    });
  });

  it("deduplicates, caps, persists recent files, and resets cleanly", async () => {
    const { commandPaletteActions, useCommandPaletteStore } = await loadStore();

    commandPaletteActions.recordRecentFile("workspace-1", "file-1");
    commandPaletteActions.recordRecentFile("workspace-1", "file-2");
    commandPaletteActions.recordRecentFile("workspace-1", "file-1");
    for (let index = 3; index <= 10; index += 1) {
      commandPaletteActions.recordRecentFile("workspace-1", `file-${index}`);
    }

    expect(
      useCommandPaletteStore.getState().recentFileIdsByWorkspace["workspace-1"]
    ).toEqual([
      "file-10",
      "file-9",
      "file-8",
      "file-7",
      "file-6",
      "file-5",
      "file-4",
      "file-3",
    ]);
    expect(localStorage.getItem("command-palette")).toContain(
      '"recentFileIdsByWorkspace":{"workspace-1":["file-10","file-9","file-8","file-7","file-6","file-5","file-4","file-3"]}'
    );

    commandPaletteActions.reset();
    expect(useCommandPaletteStore.getState()).toMatchObject({
      fileIndexByWorkspace: {},
      open: false,
      recentFileIdsByWorkspace: {},
      workspaceUuid: null,
    });
  });
});
