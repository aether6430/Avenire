import { describe, expect, it } from "vitest";
import { toRollingToolAction } from "@/components/chat/rolling-tool-activity-model";
import {
  buildAgentActionsFromToolPart,
  getToolLabel,
  type ToolPart,
} from "@/components/chat/tool-part-model";

describe("tool part model", () => {
  it("derives readable labels for known and fallback tool types", () => {
    expect(getToolLabel("tool-web_search")).toBe("Web search");
    expect(getToolLabel("tool-generate_flashcards")).toBe("Mindset Set");
    expect(getToolLabel("tool-custom_thing")).toBe("Custom Thing");
  });

  it("maps flashcard generation actions to the user-facing mindset set label fallback", () => {
    const action = toRollingToolAction({
      input: {},
      state: "input-available",
      type: "tool-generate_flashcards",
    } as never);

    expect(action).toMatchObject({
      kind: "flashcards",
      pending: true,
      value: "mindset set",
    });
  });

  it("builds agent activity actions from search citations and file excerpts", () => {
    const researchPart = {
      output: {
        citations: [{ workspacePath: "/notes/entropy.md" }],
        files: [
          {
            excerpt: "Entropy measures dispersion.",
            workspacePath: "/notes/entropy.md",
          },
        ],
        query: "entropy meaning",
      },
      state: "output-available",
      type: "tool-avenire_agent",
    } as ToolPart;

    const fileManagerPart = {
      input: {
        task: "list recent notes",
      },
      state: "input-available",
      type: "tool-file_manager_agent",
    } as ToolPart;

    expect(buildAgentActionsFromToolPart(researchPart)).toEqual([
      {
        kind: "search",
        pending: false,
        preview: {
          matches: ["/notes/entropy.md"],
          query: "entropy meaning",
        },
        value: "entropy meaning",
      },
      {
        kind: "read",
        pending: false,
        preview: {
          content: "Entropy measures dispersion.",
          path: "/notes/entropy.md",
        },
        value: "/notes/entropy.md",
      },
    ]);

    expect(buildAgentActionsFromToolPart(fileManagerPart)).toEqual([
      {
        kind: "list",
        pending: true,
        value: "workspace files",
      },
    ]);
  });
});
