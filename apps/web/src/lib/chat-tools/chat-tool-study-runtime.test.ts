import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
  getIngestionSummaryForFile: getIngestionSummaryForFileMock,
}));

const {
  createFlashcardCardForUserMock,
  createFlashcardSetForUserMock,
  fetchWorkspaceFileTextMock,
  generateTextMock,
  getFileAssetByIdMock,
  getFlashcardDashboardForUserMock,
  getFlashcardSetForUserMock,
  getIngestionSummaryForFileMock,
  languageModelMock,
  normalizeFlashcardTaxonomyMock,
  resolveMisconceptionSeedMock,
  retrieveWorkspaceChunksSharedMock,
} = vi.hoisted(() => ({
  createFlashcardCardForUserMock: vi.fn(),
  createFlashcardSetForUserMock: vi.fn(),
  fetchWorkspaceFileTextMock: vi.fn(),
  generateTextMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getFlashcardDashboardForUserMock: vi.fn(),
  getFlashcardSetForUserMock: vi.fn(),
  getIngestionSummaryForFileMock: vi.fn(),
  languageModelMock: vi.fn(() => "apollo-core"),
  normalizeFlashcardTaxonomyMock: vi.fn(),
  resolveMisconceptionSeedMock: vi.fn(),
  retrieveWorkspaceChunksSharedMock: vi.fn(),
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

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
}));

vi.mock("@/lib/flashcards", () => ({
  createFlashcardCardForUser: createFlashcardCardForUserMock,
  createFlashcardSetForUser: createFlashcardSetForUserMock,
  getFlashcardDashboardForUser: getFlashcardDashboardForUserMock,
  getFlashcardSetForUser: getFlashcardSetForUserMock,
  normalizeFlashcardTaxonomy: normalizeFlashcardTaxonomyMock,
}));

vi.mock("@/lib/retrieval-service", () => ({
  retrieveWorkspaceChunksShared: retrieveWorkspaceChunksSharedMock,
}));

vi.mock("@/lib/chat-tools/workspace-file-helpers", () => ({
  buildWorkspacePathMaps: vi.fn(async () => ({
    filePathById: new Map([["file-1", "Physics/momentum.md"]]),
    folderPathById: new Map(),
  })),
  fetchWorkspaceFileText: fetchWorkspaceFileTextMock,
  isMarkdownFile: vi.fn(
    (file: { mimeType?: string | null; name?: string }) =>
      (file.mimeType ?? "").includes("markdown") ||
      (file.name ?? "").endsWith(".md")
  ),
}));

vi.mock("@/lib/chat-tools/chat-tool-misconception-runtime", () => ({
  resolveMisconceptionSeed: resolveMisconceptionSeedMock,
}));

import {
  createStudySetWithCards,
  generateFlashcardsFromMisconception,
  generateFlashcardsFromSource,
  generateQuizFromSource,
  resolveStudySource,
} from "@/lib/chat-tools/chat-tool-study-runtime";

const ctx = {
  chatSlug: "chat-1",
  userId: "user-1",
  workspaceId: "workspace-1",
};

describe("chat tool study runtime", () => {
  beforeEach(() => {
    createFlashcardCardForUserMock.mockReset();
    createFlashcardSetForUserMock.mockReset();
    fetchWorkspaceFileTextMock.mockReset();
    generateTextMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getFlashcardDashboardForUserMock.mockReset();
    getFlashcardSetForUserMock.mockReset();
    getIngestionSummaryForFileMock.mockReset();
    normalizeFlashcardTaxonomyMock.mockReset();
    resolveMisconceptionSeedMock.mockReset();
    retrieveWorkspaceChunksSharedMock.mockReset();
  });

  it("resolves study source from direct source text, markdown files, and search results", async () => {
    await expect(
      resolveStudySource(ctx, {
        sourceText: "  Momentum is conserved.  ",
      })
    ).resolves.toEqual({
      content: "Momentum is conserved.",
      title: "Selected content",
    });

    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      mimeType: "text/markdown",
      name: "momentum.md",
    });
    fetchWorkspaceFileTextMock.mockResolvedValue("Markdown body");

    await expect(
      resolveStudySource(ctx, {
        fileId: "file-1",
      })
    ).resolves.toEqual({
      content: "Markdown body",
      title: "Physics/momentum.md",
    });

    retrieveWorkspaceChunksSharedMock.mockResolvedValue({
      results: [{ content: "Momentum comes from mass and velocity." }],
    });

    await expect(
      resolveStudySource(ctx, {
        query: "momentum",
      })
    ).resolves.toEqual({
      content: "Momentum comes from mass and velocity.",
      title: "momentum",
    });
  });

  it("fails closed when direct source text is only whitespace", async () => {
    await expect(
      resolveStudySource(ctx, {
        sourceText: "   ",
      })
    ).rejects.toThrow("A study source is required.");
  });

  it("fails closed when a non-markdown source file has no ingested text summary yet", async () => {
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      mimeType: "application/pdf",
      name: "momentum.pdf",
    });
    getIngestionSummaryForFileMock.mockResolvedValue(null);

    await expect(
      resolveStudySource(ctx, {
        fileId: "file-1",
      })
    ).rejects.toThrow(
      "The selected file does not have ingested text available yet."
    );
  });

  it("fails closed when a markdown source file has no readable text content", async () => {
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      mimeType: "text/markdown",
      name: "momentum.md",
    });
    fetchWorkspaceFileTextMock.mockResolvedValue("   ");

    await expect(
      resolveStudySource(ctx, {
        fileId: "file-1",
      })
    ).rejects.toThrow(
      "The selected file does not have ingested text available yet."
    );
  });

  it("creates or reuses a study set and appends generated cards", async () => {
    normalizeFlashcardTaxonomyMock.mockImplementation(
      (value: { subject?: string; topic?: string; concept?: string }) =>
        value
          ? {
              concept: value.concept ?? "Momentum",
              subject: value.subject ?? "physics",
              topic: value.topic ?? "collisions",
            }
          : null
    );
    getFlashcardDashboardForUserMock.mockResolvedValue({
      cardSnapshots: [],
      sets: [],
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Momentum set",
    });
    getFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Momentum set",
    });
    createFlashcardCardForUserMock.mockResolvedValue({
      id: "card-1",
    });

    const set = await createStudySetWithCards({
      cards: [
        {
          backMarkdown: "A",
          frontMarkdown: "Q",
          kind: "flashcard",
          source: {
            concept: "Momentum",
            subject: "physics",
            topic: "collisions",
          },
        },
      ],
      chatSlug: "chat-1",
      title: "Momentum set",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(createFlashcardSetForUserMock).toHaveBeenCalled();
    expect(createFlashcardCardForUserMock).toHaveBeenCalledTimes(1);
    expect(set.id).toBe("set-1");
  });

  it("fails closed when a generated study card cannot be persisted", async () => {
    normalizeFlashcardTaxonomyMock.mockImplementation(
      (value: { subject?: string; topic?: string; concept?: string }) =>
        value
          ? {
              concept: value.concept ?? "Momentum",
              subject: value.subject ?? "physics",
              topic: value.topic ?? "collisions",
            }
          : null
    );
    getFlashcardDashboardForUserMock.mockResolvedValue({
      cardSnapshots: [],
      sets: [],
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Momentum set",
    });
    createFlashcardCardForUserMock.mockResolvedValueOnce(null);

    await expect(
      createStudySetWithCards({
        cards: [
          {
            backMarkdown: "A",
            frontMarkdown: "Q",
            kind: "flashcard",
            source: {
              concept: "Momentum",
              subject: "physics",
              topic: "collisions",
            },
          },
        ],
        chatSlug: "chat-1",
        title: "Momentum set",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    ).rejects.toThrow("Unable to persist every generated study card.");
  });

  it("generates flashcards, misconception flashcards, and quizzes", async () => {
    normalizeFlashcardTaxonomyMock.mockImplementation(
      (value: { subject?: string; topic?: string; concept?: string }) =>
        value
          ? {
              concept: value.concept ?? "Momentum",
              subject: value.subject ?? "physics",
              topic: value.topic ?? "collisions",
            }
          : null
    );
    getFlashcardDashboardForUserMock.mockResolvedValue({
      cardSnapshots: [],
      sets: [],
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Momentum set",
    });
    getFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Momentum set",
    });
    createFlashcardCardForUserMock.mockResolvedValue({
      id: "card-1",
    });

    generateTextMock
      .mockResolvedValueOnce({
        output: {
          cards: [{ backMarkdown: "A", frontMarkdown: "Q" }],
          title: "Momentum set",
        },
      })
      .mockResolvedValueOnce({
        output: {
          cards: [{ backMarkdown: "A2", frontMarkdown: "Q2" }],
          title: "Momentum misconception set",
        },
      })
      .mockResolvedValueOnce({
        output: {
          questions: [
            {
              backMarkdown: "Explanation",
              correctOptionIndex: 0,
              frontMarkdown: "Question?",
              options: ["A", "B"],
            },
            {
              backMarkdown: "Explanation",
              correctOptionIndex: 1,
              frontMarkdown: "Question 2?",
              options: ["A", "B"],
            },
            {
              backMarkdown: "Explanation",
              correctOptionIndex: 0,
              frontMarkdown: "Question 3?",
              options: ["A", "B"],
            },
          ],
          title: "Momentum quiz",
        },
      });

    resolveMisconceptionSeedMock.mockResolvedValue({
      concept: "Momentum",
      reason: "Thinks momentum disappears",
      subject: "Physics",
      topic: "Collisions",
    });

    const flashcards = await generateFlashcardsFromSource(ctx, {
      sourceText: "Momentum is conserved.",
      tags: ["physics"],
      title: "Momentum set",
    } as never);
    expect(flashcards.setId).toBe("set-1");
    expect(generateTextMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Create a clean Mindset Set from the study material."
        ),
      })
    );

    const misconceptionCards = await generateFlashcardsFromMisconception(ctx, {
      concept: "Momentum",
      reason: "Thinks momentum disappears",
      subject: "Physics",
      topic: "Collisions",
      title: "Momentum misconception set",
    } as never);
    expect(resolveMisconceptionSeedMock).toHaveBeenCalled();
    expect(misconceptionCards.setId).toBe("set-1");
    expect(generateTextMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Create a clean Mindset Set from the study material."
        ),
      })
    );
    expect(generateTextMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Misconception: Thinks momentum disappears"
        ),
      })
    );

    const quiz = await generateQuizFromSource(ctx, {
      sourceText: "Momentum is conserved.",
      title: "Momentum quiz",
    } as never);
    expect(quiz.questionCount).toBe(3);
    expect(quiz.setId).toBe("set-1");
  });
});
