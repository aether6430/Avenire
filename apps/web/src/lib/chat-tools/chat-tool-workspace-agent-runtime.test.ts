import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
}));

const {
  buildWorkspacePathMapsMock,
  generateTextMock,
  getWorkspacePathForFileMock,
  languageModelMock,
  listWorkspaceFilesMock,
  resolveFileExcerptMock,
  resolveWorkspaceSearchMatchesMock,
} = vi.hoisted(() => ({
  buildWorkspacePathMapsMock: vi.fn(),
  generateTextMock: vi.fn(),
  getWorkspacePathForFileMock: vi.fn(),
  languageModelMock: vi.fn(() => "apollo-agent"),
  listWorkspaceFilesMock: vi.fn(),
  resolveFileExcerptMock: vi.fn(),
  resolveWorkspaceSearchMatchesMock: vi.fn(),
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

vi.mock("@/lib/chat-tools/workspace-file-helpers", () => ({
  buildWorkspacePathMaps: buildWorkspacePathMapsMock,
  getWorkspacePathForFile: getWorkspacePathForFileMock,
  resolveFileExcerpt: resolveFileExcerptMock,
  resolveWorkspaceSearchMatches: resolveWorkspaceSearchMatchesMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
}));

import {
  executeAvenireAgent,
  executeFileManagerAgent,
  executeSearchMaterials,
} from "@/lib/chat-tools/chat-tool-workspace-agent-runtime";

const ctx = {
  agentActivityId: "activity-1",
  emitAgentActivity: vi.fn(),
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("chat tool workspace agent runtime", () => {
  beforeEach(() => {
    buildWorkspacePathMapsMock.mockReset();
    ctx.emitAgentActivity.mockReset();
    generateTextMock.mockReset();
    getWorkspacePathForFileMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    resolveFileExcerptMock.mockReset();
    resolveWorkspaceSearchMatchesMock.mockReset();
  });

  it("executes workspace search with citation markdown", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      matches: [
        {
          fileId: "file-1",
          snippet: "Momentum is conserved.",
          workspacePath: "Physics/momentum.md",
        },
      ],
    });

    const result = await executeSearchMaterials(ctx, {
      query: "momentum",
    } as never);

    expect(result.totalMatches).toBe(1);
    expect(result.citationMarkdown).toContain("workspace-file://file-1");
  });

  it("fails closed on whitespace-only search and file-manager requests before any retrieval or model work begins", async () => {
    await expect(
      executeSearchMaterials(ctx, {
        query: "   ",
      } as never)
    ).rejects.toThrow("A workspace search query is required.");

    await expect(
      executeAvenireAgent(ctx, {
        query: "   ",
      } as never)
    ).rejects.toThrow("A workspace search query is required.");

    await expect(
      executeFileManagerAgent(ctx, {
        task: "   ",
      } as never)
    ).rejects.toThrow("A file manager task is required.");

    expect(resolveWorkspaceSearchMatchesMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("executes the retrieval agent and emits progress updates", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      maps: {
        filePathById: new Map([["file-1", "Physics/momentum.md"]]),
      },
      matches: [
        {
          fileId: "file-1",
          snippet: "Momentum is conserved.",
          sourceType: "file",
          workspacePath: "Physics/momentum.md",
        },
      ],
    });
    generateTextMock
      .mockResolvedValueOnce({ output: { indices: [0] } })
      .mockResolvedValueOnce({
        text: "Momentum note is the most relevant source.",
      });
    resolveFileExcerptMock.mockResolvedValue({
      excerpt: "Momentum is conserved in isolated systems.",
      fileId: "file-1",
      workspacePath: "Physics/momentum.md",
    });

    const result = await executeAvenireAgent(ctx, {
      query: "momentum",
    } as never);

    expect(result.summary).toContain("Momentum note");
    expect(result.files).toHaveLength(1);
    expect(ctx.emitAgentActivity).toHaveBeenCalled();
  });

  it("short-circuits the retrieval agent when the selection model chooses no files", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      maps: {
        filePathById: new Map([["file-1", "Physics/momentum.md"]]),
      },
      matches: [
        {
          fileId: "file-1",
          snippet: "Momentum is conserved.",
          sourceType: "file",
          workspacePath: "Physics/momentum.md",
        },
      ],
    });
    generateTextMock.mockResolvedValueOnce({ output: { indices: [] } });

    const result = await executeAvenireAgent(ctx, {
      query: "momentum",
    } as never);

    expect(result.summary).toBe("No relevant workspace content found.");
    expect(result.context).toBe("No relevant workspace content found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("short-circuits the retrieval agent when selected files have no readable excerpts", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      maps: {
        filePathById: new Map([["file-1", "Physics/momentum.md"]]),
      },
      matches: [
        {
          fileId: "file-1",
          snippet: "Momentum is conserved.",
          sourceType: "file",
          workspacePath: "Physics/momentum.md",
        },
      ],
    });
    generateTextMock.mockResolvedValueOnce({ output: { indices: [0] } });
    resolveFileExcerptMock.mockResolvedValue(null);

    const result = await executeAvenireAgent(ctx, {
      query: "momentum",
    } as never);

    expect(result.summary).toBe("No relevant workspace content found.");
    expect(result.context).toBe("No relevant workspace content found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("skips file-selection generation when retrieval matches have no file ids", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      maps: {
        filePathById: new Map(),
      },
      matches: [
        {
          fileId: null,
          snippet: "Momentum is conserved in isolated systems.",
          sourceType: "link",
          workspacePath: "Momentum source",
        },
      ],
    });
    generateTextMock.mockResolvedValueOnce({
      text: "Momentum is conserved in isolated systems.",
    });

    const result = await executeAvenireAgent(ctx, {
      query: "momentum",
    } as never);

    expect(result.summary).toContain("Momentum is conserved");
    expect(result.files).toEqual([]);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("short-circuits the retrieval agent when no workspace matches are found", async () => {
    resolveWorkspaceSearchMatchesMock.mockResolvedValue({
      maps: {
        filePathById: new Map(),
      },
      matches: [],
    });

    const result = await executeAvenireAgent(ctx, {
      query: "nonexistent topic",
    } as never);

    expect(result.summary).toBe("No relevant workspace content found.");
    expect(result.context).toBe("No relevant workspace content found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(ctx.emitAgentActivity).toHaveBeenCalled();
  });

  it("executes the file manager agent against candidate files", async () => {
    buildWorkspacePathMapsMock.mockResolvedValue({
      filePathById: new Map([["file-1", "Notes/momentum.md"]]),
    });
    listWorkspaceFilesMock.mockResolvedValue([
      {
        id: "file-1",
        mimeType: "text/markdown",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ]);
    getWorkspacePathForFileMock.mockReturnValue("Notes/momentum.md");
    generateTextMock
      .mockResolvedValueOnce({ output: { indices: [0] } })
      .mockResolvedValueOnce({
        text: "The momentum note is the relevant file.",
      });
    resolveFileExcerptMock.mockResolvedValue({
      excerpt: "Momentum is conserved in isolated systems.",
      fileId: "file-1",
      workspacePath: "Notes/momentum.md",
    });

    const result = await executeFileManagerAgent(ctx, {
      task: "summarize momentum files",
    } as never);

    expect(result.summary).toContain("relevant file");
    expect(result.files).toHaveLength(1);
    expect(ctx.emitAgentActivity).toHaveBeenCalled();
  });

  it("short-circuits the file manager agent when selection finds no relevant files", async () => {
    buildWorkspacePathMapsMock.mockResolvedValue({
      filePathById: new Map([["file-1", "Notes/momentum.md"]]),
    });
    listWorkspaceFilesMock.mockResolvedValue([
      {
        id: "file-1",
        mimeType: "text/markdown",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ]);
    getWorkspacePathForFileMock.mockReturnValue("Notes/momentum.md");
    generateTextMock.mockResolvedValueOnce({ output: { indices: [] } });

    const result = await executeFileManagerAgent(ctx, {
      task: "summarize momentum files",
    } as never);

    expect(result.summary).toBe("No relevant files found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("short-circuits the file manager agent when selected files have no readable excerpts", async () => {
    buildWorkspacePathMapsMock.mockResolvedValue({
      filePathById: new Map([["file-1", "Notes/momentum.md"]]),
    });
    listWorkspaceFilesMock.mockResolvedValue([
      {
        id: "file-1",
        mimeType: "text/markdown",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    ]);
    getWorkspacePathForFileMock.mockReturnValue("Notes/momentum.md");
    generateTextMock.mockResolvedValueOnce({ output: { indices: [0] } });
    resolveFileExcerptMock.mockResolvedValue(null);

    const result = await executeFileManagerAgent(ctx, {
      task: "summarize momentum files",
    } as never);

    expect(result.summary).toBe("No relevant files found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it("short-circuits the file manager agent when the workspace has no candidate files", async () => {
    buildWorkspacePathMapsMock.mockResolvedValue({
      filePathById: new Map(),
    });
    listWorkspaceFilesMock.mockResolvedValue([]);

    const result = await executeFileManagerAgent(ctx, {
      task: "summarize momentum files",
    } as never);

    expect(result.summary).toBe("No relevant files found.");
    expect(result.files).toEqual([]);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(ctx.emitAgentActivity).toHaveBeenCalled();
  });
});
