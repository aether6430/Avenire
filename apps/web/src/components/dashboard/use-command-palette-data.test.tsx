import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";

const {
  readCachedChatsMock,
  readCachedFlashcardSetsMock,
  useCommandPaletteWorkspaceBrowseMock,
  useCommandPaletteWorkspaceTasksMock,
} = vi.hoisted(() => ({
  readCachedChatsMock: vi.fn(),
  readCachedFlashcardSetsMock: vi.fn(),
  useCommandPaletteWorkspaceBrowseMock: vi.fn(),
  useCommandPaletteWorkspaceTasksMock: vi.fn(),
}));

vi.mock("@/components/dashboard/use-command-palette-workspace-browse", () => ({
  useCommandPaletteWorkspaceBrowse: useCommandPaletteWorkspaceBrowseMock,
}));

vi.mock("@/components/dashboard/use-command-palette-workspace-tasks", () => ({
  useCommandPaletteWorkspaceTasks: useCommandPaletteWorkspaceTasksMock,
}));

vi.mock("@/lib/dashboard-browser-cache", () => ({
  readCachedChats: readCachedChatsMock,
  readCachedFlashcardSets: readCachedFlashcardSetsMock,
}));

import { useCommandPaletteData } from "@/components/dashboard/use-command-palette-data";

type HookValue = ReturnType<typeof useCommandPaletteData>;

function buildChat(overrides: Record<string, unknown> = {}) {
  return {
    id: "chat-1",
    lastMessageAt: "2026-05-18T12:00:00.000Z",
    slug: "chat-1",
    title: "Momentum Review",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...overrides,
  } as never;
}

function buildFlashcardSet(overrides: Record<string, unknown> = {}) {
  return {
    description: "Study loop",
    dueCount: 0,
    id: "set-1",
    newCount: 0,
    tags: [],
    title: "Week 1",
    updatedAt: "2026-05-18T12:00:00.000Z",
    ...overrides,
  } as never;
}

function renderHookValue(
  options: Parameters<typeof useCommandPaletteData>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useCommandPaletteData(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useCommandPaletteData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommandPaletteWorkspaceBrowseMock.mockReturnValue({
      fileItems: [{ id: "file-1", path: "Docs/Plan.md" }],
      folderItems: [{ id: "folder-1", path: "Docs" }],
      recentItems: [{ id: "recent-1", path: "Docs/Recent.md" }],
      retrievalSearchItems: [{ id: "retrieval-1" }],
      searchItems: [{ id: "search-1" }],
    });
    useCommandPaletteWorkspaceTasksMock.mockReturnValue({
      workspaceTasks: [{ id: "task-1", title: "Focus" }],
      workspaceTasksLoadFailed: false,
    });
  });

  it("hydrates cached chats and flashcard sets, sorts recent items, and passes through browse/task state", () => {
    readCachedChatsMock.mockReturnValue([
      buildChat({
        slug: "older-chat",
        updatedAt: "2026-05-18T10:00:00.000Z",
      }),
      buildChat({
        slug: "newer-chat",
        updatedAt: "2026-05-18T13:00:00.000Z",
      }),
    ]);
    readCachedFlashcardSetsMock.mockReturnValue([
      buildFlashcardSet({
        id: "older-set",
        updatedAt: "2026-05-18T09:00:00.000Z",
      }),
      buildFlashcardSet({
        id: "newer-set",
        updatedAt: "2026-05-18T14:00:00.000Z",
      }),
    ]);

    const workspaces: WorkspaceSummary[] = [
      {
        name: "Aveniri",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];
    const hook = renderHookValue({
      activeFileId: "file-1",
      currentFilesFolderId: "folder-1",
      currentFilesWorkspaceUuid: "workspace-1",
      fileIndexByWorkspace: {},
      open: true,
      recentFileIdsByWorkspace: {},
      resolvedWorkspaceUuid: "workspace-1",
      router: {
        prefetch: vi.fn(),
      } as never,
      workspaces,
    });

    expect(readCachedChatsMock).toHaveBeenCalledWith("workspace-1");
    expect(readCachedFlashcardSetsMock).toHaveBeenCalledWith("workspace-1");
    expect(hook.cachedChats.map((chat) => chat.slug)).toEqual([
      "older-chat",
      "newer-chat",
    ]);
    expect(hook.recentChats.map((chat) => chat.slug)).toEqual([
      "newer-chat",
      "older-chat",
    ]);
    expect(hook.cachedFlashcardSets.map((set) => set.id)).toEqual([
      "older-set",
      "newer-set",
    ]);
    expect(hook.recentFlashcardSets.map((set) => set.id)).toEqual([
      "newer-set",
      "older-set",
    ]);
    expect(hook.fileItems).toEqual([{ id: "file-1", path: "Docs/Plan.md" }]);
    expect(hook.folderItems).toEqual([{ id: "folder-1", path: "Docs" }]);
    expect(hook.recentItems).toEqual([
      { id: "recent-1", path: "Docs/Recent.md" },
    ]);
    expect(hook.retrievalSearchItems).toEqual([{ id: "retrieval-1" }]);
    expect(hook.searchItems).toEqual([{ id: "search-1" }]);
    expect(hook.workspaceTasks).toEqual([{ id: "task-1", title: "Focus" }]);
    expect(hook.workspaceTasksLoadFailed).toBe(false);
  });

  it("fails closed to empty cached collections when no workspace is resolved", () => {
    const hook = renderHookValue({
      activeFileId: null,
      currentFilesFolderId: null,
      currentFilesWorkspaceUuid: null,
      fileIndexByWorkspace: {},
      open: false,
      recentFileIdsByWorkspace: {},
      resolvedWorkspaceUuid: null,
      router: {
        prefetch: vi.fn(),
      } as never,
      workspaces: [],
    });

    expect(readCachedChatsMock).not.toHaveBeenCalled();
    expect(readCachedFlashcardSetsMock).not.toHaveBeenCalled();
    expect(hook.cachedChats).toEqual([]);
    expect(hook.cachedFlashcardSets).toEqual([]);
    expect(hook.recentChats).toEqual([]);
    expect(hook.recentFlashcardSets).toEqual([]);
  });
});
