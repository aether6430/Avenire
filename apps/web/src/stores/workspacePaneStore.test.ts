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
  return import("@/stores/workspacePaneStore");
}

describe("workspace pane store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createLocalStorageMock());
    let index = 0;
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => `uuid-${++index}`),
    });
  });

  it("initializes, opens, and closes panes through the zustand shell", async () => {
    const { useWorkspacePaneStore } = await loadStore();

    useWorkspacePaneStore.getState().ensureInitialized({
      pathname: "/workspace/files",
      search: "",
    });
    useWorkspacePaneStore.getState().openPane("/workspace/tasks?view=board", {
      sourcePaneId: "uuid-2",
    });

    expect(useWorkspacePaneStore.getState().panes).toMatchObject([
      {
        id: "uuid-2",
        route: { pathname: "/workspace/files", search: "" },
      },
      {
        id: "uuid-3",
        route: { pathname: "/workspace/tasks", search: "?view=board" },
      },
    ]);

    useWorkspacePaneStore.getState().closePane("uuid-3");
    expect(useWorkspacePaneStore.getState().activePaneId).toBe("uuid-2");
    expect(useWorkspacePaneStore.getState().panes).toHaveLength(1);
  });

  it("syncs active pane routes and keeps pane sizes normalized", async () => {
    const { useWorkspacePaneStore } = await loadStore();

    useWorkspacePaneStore.setState({
      activePaneId: "pane-2",
      initialized: true,
      panes: [
        {
          id: "pane-1",
          route: { pathname: "/workspace/files", search: "" },
          rowId: "row-1",
          size: 20,
        },
        {
          id: "pane-2",
          route: { pathname: "/workspace/chats", search: "" },
          rowId: "row-1",
          size: 80,
        },
      ],
      rows: [{ id: "row-1", size: 100 }],
    });

    useWorkspacePaneStore.getState().setPaneSizes("row-1", [10, 10]);
    useWorkspacePaneStore.getState().syncActivePaneFromBrowser({
      pathname: "/workspace/tasks",
      search: "",
    });

    expect(
      useWorkspacePaneStore
        .getState()
        .panes.map((pane) => Math.round(pane.size))
    ).toEqual([50, 50]);
    expect(useWorkspacePaneStore.getState().panes[1]?.route).toEqual({
      pathname: "/workspace/tasks",
      search: "",
    });
  });

  it("materializes vertical splits into a second row through the zustand shell", async () => {
    const { useWorkspacePaneStore } = await loadStore();

    useWorkspacePaneStore.getState().ensureInitialized({
      pathname: "/workspace/files",
      search: "",
    });
    useWorkspacePaneStore.getState().openPane("/workspace/flashcards", {
      sourcePaneId: "uuid-2",
      splitDirection: "vertical",
    });

    expect(
      useWorkspacePaneStore
        .getState()
        .rows.map((row) => [row.id, Math.round(row.size)])
    ).toEqual([
      ["uuid-1", 50],
      ["uuid-4", 50],
    ]);
    expect(
      useWorkspacePaneStore
        .getState()
        .panes.find((pane) => pane.id === "uuid-3")
    ).toMatchObject({
      route: { pathname: "/workspace/flashcards", search: "" },
      rowId: "uuid-4",
    });
  });
});
