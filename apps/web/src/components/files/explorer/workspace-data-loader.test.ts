import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadWorkspaceFolderPayload,
  loadWorkspacePropertyDefinitionsPayload,
  loadWorkspaceTreePayload,
} from "@/components/files/explorer/workspace-data-loader";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("workspace data loader", () => {
  it("deduplicates in-flight folder loads by workspace and folder id", async () => {
    const deferred = createDeferred<Response>();
    const fetchMock = vi.fn(() => deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const first = loadWorkspaceFolderPayload("workspace-a", "folder-a");
    const second = loadWorkspaceFolderPayload("workspace-a", "folder-a");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    deferred.resolve(
      createJsonResponse({
        ancestors: [{ id: "ancestor-a", name: "Root" }],
        files: [{ id: "file-a", name: "Welcome.md" }],
        folders: [{ id: "folder-a", name: "Docs" }],
      })
    );

    await expect(first).resolves.toEqual({
      ancestors: [{ id: "ancestor-a", name: "Root" }],
      files: [{ id: "file-a", name: "Welcome.md" }],
      folders: [{ id: "folder-a", name: "Docs" }],
    });
    await expect(second).resolves.toEqual({
      ancestors: [{ id: "ancestor-a", name: "Root" }],
      files: [{ id: "file-a", name: "Welcome.md" }],
      folders: [{ id: "folder-a", name: "Docs" }],
    });
  });

  it("deduplicates in-flight tree loads by workspace", async () => {
    const deferred = createDeferred<Response>();
    const fetchMock = vi.fn(() => deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const first = loadWorkspaceTreePayload("workspace-b");
    const second = loadWorkspaceTreePayload("workspace-b");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    deferred.resolve(
      createJsonResponse({
        files: [{ id: "file-b", name: "One.md" }],
        folders: [{ id: "folder-b", name: "Folder" }],
      })
    );

    await expect(first).resolves.toEqual({
      files: [{ id: "file-b", name: "One.md" }],
      folders: [{ id: "folder-b", name: "Folder" }],
    });
    await expect(second).resolves.toEqual({
      files: [{ id: "file-b", name: "One.md" }],
      folders: [{ id: "folder-b", name: "Folder" }],
    });
  });

  it("deduplicates in-flight property registry loads and normalizes payloads", async () => {
    const deferred = createDeferred<Response>();
    const fetchMock = vi.fn(() => deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const first = loadWorkspacePropertyDefinitionsPayload("workspace-c");
    const second = loadWorkspacePropertyDefinitionsPayload("workspace-c");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    deferred.resolve(
      createJsonResponse({
        properties: [
          { key: "Topic", options: [], type: "text" },
          { key: "Difficulty", options: ["Hard"], type: "select" },
        ],
      })
    );

    await expect(first).resolves.toEqual([
      { key: "difficulty", options: ["Hard"], type: "select" },
      { key: "topic", options: [], type: "text" },
    ]);
    await expect(second).resolves.toEqual([
      { key: "difficulty", options: ["Hard"], type: "select" },
      { key: "topic", options: [], type: "text" },
    ]);
  });
});
