import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deriveWorkspaceFolderSnapshotFromTree,
  readVisibleWorkspaceFolderSnapshot,
} from "@/components/files/explorer/workspace-folder-snapshot";
import { EMPTY_PAGE_METADATA_STATE } from "@/lib/frontmatter";
import { writeWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import { writeWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";
import { writeWorkspaceTreePayload } from "@/lib/workspace-tree-client";

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

function buildFolder(
  overrides: Partial<{
    id: string;
    name: string;
    parentId: string | null;
  }> = {}
) {
  return {
    id: "folder-1",
    name: "Docs",
    parentId: "root-1",
    ...overrides,
  };
}

function buildFile(
  overrides: Partial<{
    createdAt: string;
    folderId: string;
    id: string;
    isIngested: boolean;
    mimeType: string | null;
    name: string;
    noteContent: string | null;
    page: typeof EMPTY_PAGE_METADATA_STATE;
    sizeBytes: number;
    storageUrl: string;
    updatedAt: string;
  }> = {}
) {
  return {
    createdAt: "2026-05-12T00:00:00.000Z",
    folderId: "folder-1",
    id: "file-1",
    isIngested: true,
    mimeType: "text/markdown",
    name: "Welcome.md",
    page: EMPTY_PAGE_METADATA_STATE,
    sizeBytes: 1200,
    storageUrl: "https://example.com/file-1",
    updatedAt: "2026-05-12T09:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("workspace folder snapshot", () => {
  it("derives ancestors, child folders, and current folder files from cached tree data", () => {
    expect(
      deriveWorkspaceFolderSnapshotFromTree({
        folderId: "folder-1",
        treePayload: {
          files: [
            buildFile({ id: "file-a", name: "Welcome.md" }),
            buildFile({
              folderId: "nested-1",
              id: "file-b",
              name: "Nested.md",
            }),
          ],
          folders: [
            buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
            buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
            buildFolder({
              id: "nested-1",
              name: "Specs",
              parentId: "folder-1",
            }),
          ],
        },
      })
    ).toEqual({
      ancestors: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
      files: [buildFile({ id: "file-a", name: "Welcome.md" })],
      folders: [
        buildFolder({ id: "nested-1", name: "Specs", parentId: "folder-1" }),
      ],
    });
  });

  it("prefers the exact cached folder payload when it already exists", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });

    writeWorkspaceFolderCache("workspace-a", "folder-1", {
      ancestors: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
      files: [
        buildFile({ id: "file-a", noteContent: "# Cached folder payload" }),
      ],
      folders: [
        buildFolder({ id: "nested-1", name: "Specs", parentId: "folder-1" }),
      ],
    });

    writeWorkspaceTreePayload("workspace-a", {
      files: [buildFile({ id: "file-a", noteContent: null })],
      folders: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
    });

    expect(
      readVisibleWorkspaceFolderSnapshot("workspace-a", "folder-1")
    ).toEqual({
      ancestors: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
      files: [
        buildFile({ id: "file-a", noteContent: "# Cached folder payload" }),
      ],
      folders: [
        buildFolder({ id: "nested-1", name: "Specs", parentId: "folder-1" }),
      ],
    });
  });

  it("falls back to cached tree data and hydrates markdown note content from matching markdown cache", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
    });

    writeWorkspaceTreePayload("workspace-b", {
      files: [
        buildFile({ id: "file-a", noteContent: null }),
        buildFile({
          id: "file-b",
          mimeType: "application/pdf",
          name: "Guide.pdf",
          noteContent: null,
        }),
      ],
      folders: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
    });

    writeWorkspaceMarkdownCache("workspace-b", "file-a", {
      body: "# Warm cached note",
      content: "# Warm cached note",
      page: EMPTY_PAGE_METADATA_STATE,
      updatedAt: "2026-05-12T09:00:00.000Z",
    });

    expect(
      readVisibleWorkspaceFolderSnapshot("workspace-b", "folder-1")
    ).toEqual({
      ancestors: [
        buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
        buildFolder({ id: "folder-1", name: "Docs", parentId: "root-1" }),
      ],
      files: [
        buildFile({ id: "file-a", noteContent: "# Warm cached note" }),
        buildFile({
          id: "file-b",
          mimeType: "application/pdf",
          name: "Guide.pdf",
          noteContent: null,
        }),
      ],
      folders: [],
    });
  });
});
