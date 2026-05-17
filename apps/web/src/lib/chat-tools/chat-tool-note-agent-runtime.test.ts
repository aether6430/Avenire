import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildWorkspacePathMapsMock,
  createWorkspaceNoteFileMock,
  deleteIngestionDataForFileMock,
  enqueueIngestionForFileMock,
  fetchWorkspaceFileTextMock,
  findTargetNoteFileMock,
  generateNoteDraftFromTaskMock,
  listWorkspaceFilesMock,
  publishTreeMutationEventsMock,
  resolveCreateNoteFolderMock,
  rewriteNoteFromTaskMock,
  updateFileTagsMock,
  updateNoteContentMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  buildWorkspacePathMapsMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  deleteIngestionDataForFileMock: vi.fn(),
  enqueueIngestionForFileMock: vi.fn(),
  fetchWorkspaceFileTextMock: vi.fn(),
  findTargetNoteFileMock: vi.fn(),
  generateNoteDraftFromTaskMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  publishTreeMutationEventsMock: vi.fn(),
  resolveCreateNoteFolderMock: vi.fn(),
  rewriteNoteFromTaskMock: vi.fn(),
  updateFileTagsMock: vi.fn(),
  updateNoteContentMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("@/lib/chat-tools/workspace-file-helpers", () => ({
  buildWorkspacePathMaps: buildWorkspacePathMapsMock,
  fetchWorkspaceFileText: fetchWorkspaceFileTextMock,
  findTargetNoteFile: findTargetNoteFileMock,
  isMarkdownFile: vi.fn(() => true),
  publishTreeMutationEvents: publishTreeMutationEventsMock,
}));

vi.mock("@/lib/chat-tools/chat-tool-note-runtime", () => ({
  enqueueIngestionForFile: enqueueIngestionForFileMock,
  generateNoteDraftFromTask: generateNoteDraftFromTaskMock,
  resolveCreateNoteFolder: resolveCreateNoteFolderMock,
  rewriteNoteFromTask: rewriteNoteFromTaskMock,
  updateFileTags: updateFileTagsMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
  updateNoteContent: updateNoteContentMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/ingestion-data", () => ({
  deleteIngestionDataForFile: deleteIngestionDataForFileMock,
}));

import { executeNoteAgent } from "@/lib/chat-tools/chat-tool-note-agent-runtime";

const ctx = {
  rootFolderId: "root-1",
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("chat tool note agent runtime", () => {
  beforeEach(() => {
    buildWorkspacePathMapsMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    deleteIngestionDataForFileMock.mockReset();
    enqueueIngestionForFileMock.mockReset();
    fetchWorkspaceFileTextMock.mockReset();
    findTargetNoteFileMock.mockReset();
    generateNoteDraftFromTaskMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    publishTreeMutationEventsMock.mockReset();
    resolveCreateNoteFolderMock.mockReset();
    rewriteNoteFromTaskMock.mockReset();
    updateFileTagsMock.mockReset();
    updateNoteContentMock.mockReset();
    userCanEditFileMock.mockReset();

    buildWorkspacePathMapsMock.mockResolvedValue({
      filePathById: new Map([["file-1", "Notes/momentum.md"]]),
      folderPathById: new Map(),
    });
  });

  it("creates a note and returns a created summary", async () => {
    listWorkspaceFilesMock.mockResolvedValue([]);
    generateNoteDraftFromTaskMock.mockResolvedValue({
      bodyMarkdown: "Momentum is conserved.",
      title: "Momentum Review",
    });
    resolveCreateNoteFolderMock.mockResolvedValue("folder-1");
    createWorkspaceNoteFileMock.mockResolvedValue({
      fileId: "file-1",
      folderId: "folder-1",
      id: "file-1",
      name: "momentum-review.md",
      updatedAt: "2026-05-17T00:00:00.000Z",
      page: null,
    });

    const result = await executeNoteAgent(ctx, {
      task: 'Create a note called "Momentum Review"',
    } as never);

    expect(result.operation).toBe("created");
    expect(createWorkspaceNoteFileMock).toHaveBeenCalled();
    expect(enqueueIngestionForFileMock).toHaveBeenCalled();
    expect(result.notes[0]?.title).toBe("momentum-review.md");
  });

  it("reads the targeted note when asked to show it", async () => {
    const file = {
      id: "file-1",
      name: "momentum.md",
      updatedAt: "2026-05-17T00:00:00.000Z",
      page: null,
    };
    listWorkspaceFilesMock.mockResolvedValue([file]);
    findTargetNoteFileMock.mockReturnValue(file);
    fetchWorkspaceFileTextMock.mockResolvedValue("Momentum summary");

    const result = await executeNoteAgent(ctx, {
      task: 'Show note "momentum"',
    } as never);

    expect(result.operation).toBe("read");
    expect(result.notes[0]?.contentPreview).toContain("Momentum summary");
  });

  it("updates the targeted note and refreshes ingestion state", async () => {
    const file = {
      folderId: "folder-1",
      id: "file-1",
      name: "momentum.md",
      updatedAt: "2026-05-17T00:00:00.000Z",
      page: null,
    };
    listWorkspaceFilesMock.mockResolvedValue([file]);
    findTargetNoteFileMock.mockReturnValue(file);
    userCanEditFileMock.mockResolvedValue(true);
    fetchWorkspaceFileTextMock.mockResolvedValue("Old content");
    rewriteNoteFromTaskMock.mockResolvedValue("New content\n");
    updateNoteContentMock.mockResolvedValue({
      updatedAt: new Date("2026-05-17T01:00:00.000Z"),
    });
    updateFileTagsMock.mockResolvedValue(file);

    const result = await executeNoteAgent(ctx, {
      task: 'Update note "momentum"',
    } as never);

    expect(result.operation).toBe("updated");
    expect(deleteIngestionDataForFileMock).toHaveBeenCalledWith(
      "workspace-1",
      "file-1"
    );
    expect(enqueueIngestionForFileMock).toHaveBeenCalled();
  });

  it("lists notes when there is no explicit note action", async () => {
    listWorkspaceFilesMock.mockResolvedValue([
      {
        id: "file-1",
        name: "momentum.md",
        updatedAt: "2026-05-17T00:00:00.000Z",
        page: null,
      },
    ]);
    fetchWorkspaceFileTextMock.mockResolvedValue("Momentum summary");

    const result = await executeNoteAgent(ctx, {
      task: "notes overview",
    } as never);

    expect(result.operation).toBe("listed");
    expect(result.notes).toHaveLength(1);
  });
});
