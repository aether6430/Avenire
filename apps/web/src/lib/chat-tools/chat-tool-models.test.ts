import { describe, expect, it } from "vitest";
import {
  agentSelectionSchema,
  buildAgentSelectionPrompt,
  buildFileManagerSelectionPrompt,
  flashcardGenerationSchema,
  noteDraftSchema,
  noteRewriteSchema,
  quizGenerationSchema,
} from "@/lib/chat-tools/chat-tool-models";

describe("chat tool models", () => {
  it("accepts the local generation schemas", () => {
    expect(
      noteDraftSchema.parse({
        bodyMarkdown: "Body",
        title: "Momentum review",
      })
    ).toEqual({
      bodyMarkdown: "Body",
      title: "Momentum review",
    });

    expect(
      noteRewriteSchema.parse({
        markdown: "# Updated note",
      })
    ).toEqual({
      markdown: "# Updated note",
    });

    expect(
      flashcardGenerationSchema.parse({
        cards: [{ backMarkdown: "A", frontMarkdown: "Q" }],
        title: "Set",
      }).title
    ).toBe("Set");

    expect(
      quizGenerationSchema.parse({
        questions: [
          {
            backMarkdown: "Explanation",
            correctOptionIndex: 1,
            frontMarkdown: "Question?",
            options: ["A", "B"],
          },
          {
            backMarkdown: "Explanation",
            correctOptionIndex: 0,
            frontMarkdown: "Question?",
            options: ["A", "B"],
          },
          {
            backMarkdown: "Explanation",
            correctOptionIndex: 0,
            frontMarkdown: "Question?",
            options: ["A", "B"],
          },
        ],
        title: "Quiz",
      }).title
    ).toBe("Quiz");
  });

  it("builds retrieval and file-manager selection prompts", () => {
    const retrievalPrompt = buildAgentSelectionPrompt({
      maxFiles: 2,
      query: "momentum",
      matches: [
        {
          fileId: "file-1",
          snippet: "Momentum is conserved in isolated systems.",
          sourceType: "file",
          workspacePath: "Physics/Week 2/momentum.md",
        },
      ],
    });

    expect(retrievalPrompt).toContain("Select up to 2 items.");
    expect(retrievalPrompt).toContain("Physics/Week 2/momentum.md");

    const fileManagerPrompt = buildFileManagerSelectionPrompt({
      files: [
        {
          fileId: "file-2",
          mimeType: "text/markdown",
          updatedAt: "2026-05-17T00:00:00.000Z",
          workspacePath: "Notes/momentum.md",
        },
      ],
      maxFiles: 3,
      task: "summarize momentum notes",
    });

    expect(fileManagerPrompt).toContain("Select up to 3 items.");
    expect(fileManagerPrompt).toContain("summarize momentum notes");
    expect(fileManagerPrompt).toContain("Notes/momentum.md");
  });

  it("limits agent selection indices via schema", () => {
    expect(agentSelectionSchema.parse({ indices: [0, 1, 2] })).toEqual({
      indices: [0, 1, 2],
    });
  });
});
