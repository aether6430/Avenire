import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFlashcardCardForUserMock,
  createFlashcardSetForUserMock,
  generateTextMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  languageModelMock,
  outputObjectMock,
} = vi.hoisted(() => ({
  createFlashcardCardForUserMock: vi.fn(),
  createFlashcardSetForUserMock: vi.fn(),
  generateTextMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  languageModelMock: vi.fn((model: string) => ({ model })),
  outputObjectMock: vi.fn(({ schema }: { schema: unknown }) => ({ schema })),
}));

vi.mock("@avenire/ai", () => ({
  Output: {
    object: outputObjectMock,
  },
  generateText: generateTextMock,
}));

vi.mock("@avenire/ai/models", () => ({
  apollo: {
    languageModel: languageModelMock,
  },
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  createFlashcardCardForUser: createFlashcardCardForUserMock,
  createFlashcardSetForUser: createFlashcardSetForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

describe("/api/flashcards/onboarding route", () => {
  beforeEach(() => {
    createFlashcardCardForUserMock.mockReset();
    createFlashcardSetForUserMock.mockReset();
    generateTextMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    languageModelMock.mockReset();
    outputObjectMock.mockReset();

    languageModelMock.mockImplementation((model: string) => ({ model }));
    outputObjectMock.mockImplementation(({ schema }: { schema: unknown }) => ({
      schema,
    }));
    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/onboarding", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid onboarding payloads including whitespace-only fields", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/onboarding", {
        method: "POST",
        body: JSON.stringify({
          concept: "   ",
          reason: "why",
          subject: "JS",
          topic: "Functions",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("returns 500 when the generated deck cannot be persisted", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    generateTextMock.mockResolvedValue({
      output: {
        cards: [
          {
            backMarkdown: "Back",
            frontMarkdown: "Front",
            notesMarkdown: null,
            tags: [],
          },
        ],
        title: "Generated title",
      },
    });
    createFlashcardSetForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/onboarding", {
        method: "POST",
        body: JSON.stringify({
          concept: "Closures",
          reason: "mixed up scope",
          subject: "JavaScript",
          topic: "Functions",
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to create mindset set.",
    });
  });

  it("creates a generated onboarding set, persists cards, and invalidates caches", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    generateTextMock.mockResolvedValue({
      output: {
        cards: [
          {
            backMarkdown: "Back 1",
            frontMarkdown: "Front 1",
            notesMarkdown: null,
            tags: ["tag-1"],
          },
          {
            backMarkdown: "Back 2",
            frontMarkdown: "Front 2",
            notesMarkdown: "Note 2",
            tags: [],
          },
        ],
        title: "Generated title",
      },
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Generated title",
    });
    createFlashcardCardForUserMock
      .mockResolvedValueOnce({ id: "card-1" })
      .mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/onboarding", {
        method: "POST",
        body: JSON.stringify({
          concept: "  Closures  ",
          count: 2,
          reason: "  mixed up scope  ",
          subject: "  JavaScript  ",
          topic: "  Functions  ",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cards: [
        {
          backMarkdown: "Back 1",
          frontMarkdown: "Front 1",
          id: "card-1",
          notesMarkdown: null,
          tags: ["tag-1"],
        },
      ],
      set: {
        id: "set-1",
        title: "Generated title",
      },
    });
    expect(languageModelMock).toHaveBeenCalledWith("apollo-core");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Return exactly 2 cards."),
      })
    );
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Generate mindset cards that confront the wrong model"
        ),
      })
    );
    expect(createFlashcardSetForUserMock).toHaveBeenCalledWith({
      sourceChatSlug: "onboarding",
      sourceType: "ai-generated",
      title: "Generated title",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(createFlashcardCardForUserMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        backMarkdown: "Back 1",
        frontMarkdown: "Front 1",
        payload: {
          source: "onboarding",
          sourceIndex: 0,
        },
        setId: "set-1",
        source: {
          concept: "Closures",
          subject: "JavaScript",
          topic: "Functions",
        },
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    );
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });

  it("prefers the provided title over the generated one when creating the set", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    generateTextMock.mockResolvedValue({
      output: {
        cards: [
          {
            backMarkdown: "Back",
            frontMarkdown: "Front",
            notesMarkdown: null,
            tags: [],
          },
        ],
        title: "Generated title",
      },
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-1",
      title: "Manual title",
    });
    createFlashcardCardForUserMock.mockResolvedValue({ id: "card-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/onboarding", {
        method: "POST",
        body: JSON.stringify({
          concept: "Closures",
          reason: "mixed up scope",
          subject: "JavaScript",
          title: "  Manual title  ",
          topic: "Functions",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createFlashcardSetForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Manual title",
      })
    );
  });
});
