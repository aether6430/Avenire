import { describe, expect, it, vi } from "vitest";
import {
  createFlashcardReviewCommittedEvent,
  deriveFlashcardReviewLearningActions,
  emitFlashcardReviewEvent,
  extractFlashcardSourceTaxonomy,
  subscribeFlashcardReviewEvents,
} from "./flashcard-review-events";

describe("flashcard-review-events", () => {
  it("extracts canonical taxonomy from flashcard source", () => {
    expect(
      extractFlashcardSourceTaxonomy({
        concept: "  Gibbs free energy  ",
        subject: "Chemistry",
        taxonomy: {
          topic: " Thermodynamics ",
        },
      })
    ).toEqual({
      concept: "Gibbs free energy",
      subject: "Chemistry",
      topic: "Thermodynamics",
    });
  });

  it("builds a committed review event with taxonomy and review metadata", () => {
    const event = createFlashcardReviewCommittedEvent({
      card: {
        backMarkdown: "Back",
        createdAt: "2026-01-01T00:00:00.000Z",
        frontMarkdown: "Front",
        id: "card-1",
        kind: "flashcard",
        notesMarkdown: null,
        ordinal: 1,
        payload: {},
        setId: "set-1",
        source: {
          concept: "Gibbs free energy",
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
        tags: ["chemistry"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      nextState: "review",
      previousState: "learning",
      rating: "good",
      reviewedAt: new Date("2026-01-02T12:00:00.000Z"),
      set: {
        id: "set-1",
        sourceType: "ai-generated",
        title: "Chemistry deck",
        workspaceId: "workspace-1",
      },
      stability: 12.5,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(event).toMatchObject({
      card: { id: "card-1", setId: "set-1" },
      concept: "Gibbs free energy",
      nextState: "review",
      previousState: "learning",
      rating: "good",
      reviewedAt: "2026-01-02T12:00:00.000Z",
      set: {
        id: "set-1",
        sourceType: "ai-generated",
        title: "Chemistry deck",
        workspaceId: "workspace-1",
      },
      stability: 12.5,
      subject: "Chemistry",
      topic: "Thermodynamics",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("notifies listeners once per emitted review event", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFlashcardReviewEvents(listener);

    const event = createFlashcardReviewCommittedEvent({
      card: {
        backMarkdown: "Back",
        createdAt: "2026-01-01T00:00:00.000Z",
        frontMarkdown: "Front",
        id: "card-2",
        kind: "flashcard",
        notesMarkdown: null,
        ordinal: 1,
        payload: {},
        setId: "set-2",
        source: {
          concept: "Reaction rate",
          subject: "Chemistry",
          topic: "Kinetics",
        },
        tags: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      nextState: "review",
      previousState: null,
      rating: "again",
      reviewedAt: new Date("2026-01-02T12:00:00.000Z"),
      set: {
        id: "set-2",
        sourceType: "manual",
        title: "Chemistry deck",
        workspaceId: "workspace-1",
      },
      stability: null,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    emitFlashcardReviewEvent(event);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
    emitFlashcardReviewEvent(event);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("creates a misconception signal after two consecutive again reviews", () => {
    const event = createFlashcardReviewCommittedEvent({
      card: {
        backMarkdown: "Back",
        createdAt: "2026-01-01T00:00:00.000Z",
        frontMarkdown: "Front",
        id: "card-3",
        kind: "flashcard",
        notesMarkdown: null,
        ordinal: 1,
        payload: {},
        setId: "set-3",
        source: {
          concept: "Reaction rate",
          subject: "Chemistry",
          topic: "Kinetics",
        },
        tags: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      nextState: "learning",
      previousState: "learning",
      rating: "again",
      reviewedAt: new Date("2026-01-02T12:00:00.000Z"),
      set: {
        id: "set-3",
        sourceType: "manual",
        title: "Chemistry deck",
        workspaceId: "workspace-1",
      },
      stability: null,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(
      deriveFlashcardReviewLearningActions({
        event,
        recentCardRatings: ["again", "again"],
        recentConceptRatings: ["again", "again", "again"],
      })
    ).toEqual({
      mastery: {
        concept: "Reaction rate",
        reviewedAt: "2026-01-02T12:00:00.000Z",
        subject: "Chemistry",
        topic: "Kinetics",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      misconception: {
        confidence: 0.6,
        concept: "Reaction rate",
        reason: "Repeated again reviews on the same card",
        source: "fsrs_signal",
        subject: "Chemistry",
        topic: "Kinetics",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      resolveMisconception: null,
    });
  });

  it("resolves misconceptions after three consecutive good or easy reviews", () => {
    const event = createFlashcardReviewCommittedEvent({
      card: {
        backMarkdown: "Back",
        createdAt: "2026-01-01T00:00:00.000Z",
        frontMarkdown: "Front",
        id: "card-4",
        kind: "flashcard",
        notesMarkdown: null,
        ordinal: 1,
        payload: {},
        setId: "set-4",
        source: {
          concept: "Reaction rate",
          subject: "Chemistry",
          topic: "Kinetics",
        },
        tags: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      nextState: "review",
      previousState: "review",
      rating: "good",
      reviewedAt: new Date("2026-01-03T12:00:00.000Z"),
      set: {
        id: "set-4",
        sourceType: "manual",
        title: "Chemistry deck",
        workspaceId: "workspace-1",
      },
      stability: 12.5,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(
      deriveFlashcardReviewLearningActions({
        event,
        recentCardRatings: ["good", "good"],
        recentConceptRatings: ["good", "easy", "good"],
      })
    ).toEqual({
      mastery: {
        concept: "Reaction rate",
        reviewedAt: "2026-01-03T12:00:00.000Z",
        subject: "Chemistry",
        topic: "Kinetics",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      misconception: null,
      resolveMisconception: {
        concept: "Reaction rate",
        reviewedAt: "2026-01-03T12:00:00.000Z",
        subject: "Chemistry",
        topic: "Kinetics",
        userId: "user-1",
        workspaceId: "workspace-1",
      },
    });
  });
});
