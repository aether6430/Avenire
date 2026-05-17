import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
}));

const {
  getFlashcardDashboardForUserMock,
  listDueFlashcardsForUserMock,
  normalizeFlashcardTaxonomyMock,
} = vi.hoisted(() => ({
  getFlashcardDashboardForUserMock: vi.fn(),
  listDueFlashcardsForUserMock: vi.fn(),
  normalizeFlashcardTaxonomyMock: vi.fn(),
}));

vi.mock("@/lib/flashcards", () => ({
  getFlashcardDashboardForUser: getFlashcardDashboardForUserMock,
  listDueFlashcardsForUser: listDueFlashcardsForUserMock,
  normalizeFlashcardTaxonomy: normalizeFlashcardTaxonomyMock,
}));

import { executeGetDueCards } from "@/lib/chat-tools/chat-tool-due-cards-runtime";

describe("chat tool due cards runtime", () => {
  beforeEach(() => {
    getFlashcardDashboardForUserMock.mockReset();
    listDueFlashcardsForUserMock.mockReset();
    normalizeFlashcardTaxonomyMock.mockReset();
  });

  it("returns dashboard due count when no scope filter is set", async () => {
    getFlashcardDashboardForUserMock.mockResolvedValue({
      dueCount: 7,
      cardSnapshots: [],
    });
    listDueFlashcardsForUserMock.mockResolvedValue([
      {
        card: {
          frontMarkdown: "Q1",
          id: "card-1",
          kind: "flashcard",
        },
        remainingDueCount: 7,
        reviewState: { dueAt: "2026-05-17T00:00:00.000Z" },
        set: { id: "set-1", title: "Physics" },
      },
    ]);

    const result = await executeGetDueCards(
      { userId: "user-1", workspaceId: "workspace-1" },
      {} as never
    );

    expect(result.totalDueCount).toBe(7);
    expect(result.dueCards).toHaveLength(1);
  });

  it("filters due cards by taxonomy scope", async () => {
    normalizeFlashcardTaxonomyMock.mockImplementation(
      (source: { subject?: string; topic?: string; concept?: string }) =>
        source
          ? {
              concept: source.concept ?? "Momentum",
              subject: source.subject ?? "physics",
              topic: source.topic ?? "collisions",
            }
          : null
    );
    getFlashcardDashboardForUserMock.mockResolvedValue({
      dueCount: 3,
      cardSnapshots: [
        {
          card: {
            id: "card-1",
            source: { subject: "physics", topic: "collisions" },
          },
        },
        {
          card: {
            id: "card-2",
            source: { subject: "history", topic: "rome" },
          },
        },
      ],
    });
    listDueFlashcardsForUserMock.mockResolvedValue([
      {
        card: {
          frontMarkdown: "Physics card",
          id: "card-1",
          kind: "flashcard",
        },
        remainingDueCount: 1,
        reviewState: { dueAt: null },
        set: { id: "set-1", title: "Physics" },
      },
      {
        card: {
          frontMarkdown: "History card",
          id: "card-2",
          kind: "flashcard",
        },
        remainingDueCount: 2,
        reviewState: { dueAt: null },
        set: { id: "set-2", title: "History" },
      },
    ]);

    const result = await executeGetDueCards(
      { userId: "user-1", workspaceId: "workspace-1" },
      { subject: "physics", topic: "collisions" } as never
    );

    expect(result.totalDueCount).toBe(1);
    expect(result.dueCards).toHaveLength(1);
    expect(result.dueCards[0]?.cardId).toBe("card-1");
  });
});
