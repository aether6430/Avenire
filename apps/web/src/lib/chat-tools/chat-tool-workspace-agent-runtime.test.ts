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
});
