import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
}));

import {
  buildCitationMarkdown,
  buildMisconceptionContext,
  buildMisconceptionStudySource,
  buildTopicKey,
  inferFlashcardTaxonomy,
  mapMisconceptionForTool,
  matchesTaxonomyScope,
  normalizeMisconceptionSubjectKey,
  normalizeStudyMatchKey,
} from "@/lib/chat-tools/study-tool-helpers";

describe("study tool helpers", () => {
  it("normalizes misconception and study matching keys", () => {
    expect(normalizeMisconceptionSubjectKey("Computer_Science")).toBe(
      "computer science"
    );
    expect(normalizeStudyMatchKey("  Momentum-Review! ")).toBe(
      "momentum review"
    );
  });

  it("builds stable topic keys and scope matches", () => {
    const taxonomy = {
      concept: "Conservation of Momentum",
      subject: "Physics",
      topic: "Momentum Review",
    };

    expect(buildTopicKey(taxonomy)).toBe("physics::momentum review");
    expect(
      matchesTaxonomyScope(taxonomy, {
        subject: "physics",
        topic: "Momentum Review",
      })
    ).toBe(true);
    expect(
      matchesTaxonomyScope(taxonomy, {
        concept: "Vectors",
      })
    ).toBe(false);
  });

  it("builds misconception tutoring context and study source text", () => {
    const misconception = {
      confidence: 0.82,
      concept: "Momentum",
      reason: "Thinks momentum is not conserved in isolated collisions",
      subject: "Physics",
      topic: "Collisions",
    };

    expect(
      buildMisconceptionContext([
        {
          ...misconception,
          active: true,
          createdAt: "2026-05-17T00:00:00.000Z",
          id: "m-1",
          resolvedAt: null,
          source: "manual",
          updatedAt: "2026-05-17T00:00:00.000Z",
          workspaceId: "workspace-1",
        } as never,
      ])
    ).toContain("Active learning misconceptions:");
    expect(buildMisconceptionStudySource(misconception)).toContain(
      "Misconception: Thinks momentum is not conserved in isolated collisions"
    );
  });

  it("maps misconception records for tool output", () => {
    const mapped = mapMisconceptionForTool({
      active: true,
      confidence: 0.77,
      concept: "Impulse",
      createdAt: "2026-05-17T00:00:00.000Z",
      id: "m-2",
      reason: "Confuses force and impulse",
      resolvedAt: null,
      source: "chat_tool",
      subject: "Physics",
      topic: "Impulse",
      updatedAt: "2026-05-17T00:00:00.000Z",
      workspaceId: "workspace-1",
    } as never);

    expect(mapped).toMatchObject({
      concept: "Impulse",
      reason: "Confuses force and impulse",
      subject: "Physics",
      topic: "Impulse",
    });
  });

  it("formats workspace citations and infers flashcard taxonomy", () => {
    expect(
      buildCitationMarkdown([
        {
          fileId: "file-1",
          page: 4,
          workspacePath: "Physics/Week 1/lecture-plan.md",
        },
        {
          endMs: 15_000,
          fileId: "file-2",
          startMs: 3000,
          workspacePath: "Physics/Week 2/audio-note.mp3",
        },
      ])
    ).toBe(
      "[Physics/Week 1/lecture-plan.md p.4](workspace-file://file-1), [Physics/Week 2/audio-note.mp3 0:03-0:15](workspace-file://file-2)"
    );

    expect(
      inferFlashcardTaxonomy({
        query: "Momentum conservation in collisions",
        sourceText: "Momentum is conserved in isolated systems.",
        title: "Physics study guide",
      })
    ).toMatchObject({
      subject: "physics",
      topic: "Momentum conservation in collisions",
    });
  });
});
