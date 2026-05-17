import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFolderMock,
  ensureWritableTargetFolderMock,
  generateTextMock,
  languageModelMock,
  publishWorkspaceStreamEventMock,
  resolveFolderIdByPathHintMock,
  scheduleIngestionJobMock,
  updateFileAssetMock,
} = vi.hoisted(() => ({
  createFolderMock: vi.fn(),
  ensureWritableTargetFolderMock: vi.fn(),
  generateTextMock: vi.fn(),
  languageModelMock: vi.fn(() => "apollo-core"),
  publishWorkspaceStreamEventMock: vi.fn(),
  resolveFolderIdByPathHintMock: vi.fn(),
  scheduleIngestionJobMock: vi.fn(),
  updateFileAssetMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  generateText: generateTextMock,
  Output: {
    object: ({ schema }: { schema: unknown }) => schema,
  },
}));

vi.mock("@avenire/ai/models", () => ({
  apollo: {
    languageModel: languageModelMock,
  },
}));

vi.mock("@avenire/ingestion/queue", () => ({
  scheduleIngestionJob: scheduleIngestionJobMock,
}));

vi.mock("@/lib/file-data", () => ({
  createFolder: createFolderMock,
  updateFileAsset: updateFileAssetMock,
}));

vi.mock("@/lib/chat-tools/workspace-file-helpers", () => ({
  ensureWritableTargetFolder: ensureWritableTargetFolderMock,
  resolveFolderIdByPathHint: resolveFolderIdByPathHintMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import {
  enqueueIngestionForFile,
  generateNoteDraftFromTask,
  resolveCreateNoteFolder,
  rewriteNoteFromTask,
  updateFileTags,
} from "@/lib/chat-tools/chat-tool-note-runtime";

describe("chat tool note runtime", () => {
  beforeEach(() => {
    createFolderMock.mockReset();
    ensureWritableTargetFolderMock.mockReset();
    generateTextMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    resolveFolderIdByPathHintMock.mockReset();
    scheduleIngestionJobMock.mockReset();
    updateFileAssetMock.mockReset();
  });

  it("generates note drafts and strips repeated title headings", async () => {
    generateTextMock.mockResolvedValue({
      output: {
        bodyMarkdown: "# Momentum Review\n\nKey ideas",
        title: "Momentum Review",
      },
    });

    await expect(
      generateNoteDraftFromTask({
        task: "Create a note about momentum review",
      })
    ).resolves.toEqual({
      bodyMarkdown: "Key ideas",
      title: "Momentum Review",
    });
  });

  it("rewrites notes through the model output", async () => {
    generateTextMock.mockResolvedValue({
      output: {
        markdown: "# Updated\n\nBody",
      },
    });

    await expect(
      rewriteNoteFromTask({
        currentMarkdown: "# Old",
        fileName: "old.md",
        task: "Improve it",
      })
    ).resolves.toBe("# Updated\n\nBody\n");
  });

  it("updates tags via page metadata and no-ops when there is no directive", async () => {
    const file = {
      id: "file-1",
      page: {
        properties: {
          tags: {
            type: "multi_select",
            value: ["physics"],
          },
        },
      },
    } as never;

    updateFileAssetMock.mockResolvedValue({
      ...file,
      page: {
        properties: {
          tags: {
            type: "multi_select",
            value: ["physics", "review"],
          },
        },
      },
    });

    const updated = await updateFileTags({
      file,
      tagDirective: { action: "add", tags: ["review"] },
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(updateFileAssetMock).toHaveBeenCalled();
    expect(updated.page.properties.tags.value).toEqual(["physics", "review"]);

    await expect(
      updateFileTags({
        file,
        tagDirective: null,
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).resolves.toBe(file);
  });

  it("resolves note folders from existing hints or creates Notes", async () => {
    const maps = {
      filePathById: new Map(),
      folderPathById: new Map([
        ["root-1", ""],
        ["folder-1", "Physics/Week 1"],
      ]),
    };

    createFolderMock.mockResolvedValue({ id: "notes-1" });
    resolveFolderIdByPathHintMock.mockReturnValueOnce("folder-1");
    resolveFolderIdByPathHintMock.mockReturnValueOnce(null);

    await expect(
      resolveCreateNoteFolder(
        {
          rootFolderId: "root-1",
          userId: "user-1",
          workspaceId: "workspace-1",
        },
        maps,
        "Physics/Week 1"
      )
    ).resolves.toBe("folder-1");
    expect(ensureWritableTargetFolderMock).toHaveBeenCalledWith(
      {
        rootFolderId: "root-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      "folder-1"
    );

    await expect(
      resolveCreateNoteFolder(
        {
          rootFolderId: "root-1",
          userId: "user-1",
          workspaceId: "workspace-1",
        },
        maps,
        "Missing"
      )
    ).resolves.toBe("notes-1");
    expect(createFolderMock).toHaveBeenCalledWith(
      "workspace-1",
      "root-1",
      "Notes",
      "user-1"
    );
  });

  it("enqueues ingestion and publishes upload events", async () => {
    scheduleIngestionJobMock.mockResolvedValue({ id: "job-1" });

    await expect(
      enqueueIngestionForFile({
        fileId: "file-1",
        folderId: "folder-1",
        workspaceId: "workspace-1",
      })
    ).resolves.toEqual({ id: "job-1" });

    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledTimes(2);
  });
});
