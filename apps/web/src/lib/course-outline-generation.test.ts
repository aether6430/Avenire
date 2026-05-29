import { describe, expect, it } from "vitest";
import {
  buildCourseOutline,
  parseCourseSubtopics,
} from "./course-outline-generation";

describe("course outline generation", () => {
  it("parses concise user subtopics into normalized outline seeds", () => {
    expect(
      parseCourseSubtopics(
        "Forces and motion\n2. Moments - Energy transfers; Circular motion"
      )
    ).toEqual([
      "Forces and motion",
      "Moments",
      "Energy transfers",
      "Circular motion",
    ]);
  });

  it("builds a reviewable hierarchy from explicit topics and grounded sources", () => {
    const outline = buildCourseOutline({
      exam: "A Level",
      explicitSubtopics: ["Moments", "Circular motion"],
      sources: [
        {
          content:
            "Circular motion requires centripetal acceleration and resultant force. Energy transfers often appear in multi-step mechanics questions.",
          kind: "web",
          label: "A Level Mechanics circular motion revision",
          url: "https://example.com/mechanics",
        },
      ],
      topic: "Mechanics",
    });

    expect(outline.title).toBe("A Level Mechanics");
    expect(outline.nodes[0]).toMatchObject({
      nodeType: "module",
      parentId: null,
      title: "A Level Mechanics",
    });
    expect(outline.nodes.map((node) => node.title)).toContain("Moments");
    expect(outline.nodes.map((node) => node.title)).toContain(
      "Circular motion"
    );
    expect(
      outline.nodes.find((node) => node.title === "Circular motion")?.sourceRefs
    ).toEqual([
      {
        label: "A Level Mechanics circular motion revision",
        type: "url",
        url: "https://example.com/mechanics",
      },
    ]);
    expect(outline.summary.focusCount).toBeGreaterThan(0);
  });
});
