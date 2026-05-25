import { describe, expect, it } from "vitest";
import {
  getMentionTrigger,
  getWorkspaceMentionSuggestions,
} from "@/components/chat/multimodal-input-model";

describe("multimodal input model", () => {
  it("detects an @mention trigger at the current cursor", () => {
    expect(getMentionTrigger("open @wel", 9, 9)).toEqual({
      query: "wel",
      rangeEnd: 9,
      rangeStart: 5,
    });

    expect(getMentionTrigger("open @wel", 4, 4)).toBeNull();
    expect(getMentionTrigger("open @wel", 5, 8)).toBeNull();
  });

  it("ranks mention suggestions by exactness and path", () => {
    const trigger = {
      query: "wel",
      rangeEnd: 9,
      rangeStart: 5,
    };

    const suggestions = getWorkspaceMentionSuggestions({
      files: [
        {
          contentType: "text/markdown",
          id: "2",
          name: "Notes.md",
          nameLower: "notes.md",
          parentPath: "guide",
          pathLower: "guide/welcome.md",
          url: "/2",
          workspacePath: "guide/Welcome.md",
        },
        {
          contentType: "text/markdown",
          id: "1",
          name: "Welcome.md",
          nameLower: "welcome.md",
          parentPath: "",
          pathLower: "welcome.md",
          url: "/1",
          workspacePath: "Welcome.md",
        },
      ],
      query: "wel",
      trigger,
    });

    expect(suggestions.map((item) => item.id)).toEqual(["1", "2"]);
  });
});
