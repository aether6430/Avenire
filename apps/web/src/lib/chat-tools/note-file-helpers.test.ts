import { describe, expect, it } from "vitest";
import {
  buildNoteContent,
  extractTagDirective,
  normalizeNoteFileName,
  parseRequestedNoteDestination,
  sanitizeNoteTitle,
  stripLeadingTitleHeading,
  stripNoteExtension,
  toMarkdownFileName,
} from "@/lib/chat-tools/note-file-helpers";

describe("chat tool note file helpers", () => {
  it("normalizes markdown filenames and titles", () => {
    expect(toMarkdownFileName("Linear Algebra Notes")).toBe(
      "linear-algebra-notes.md"
    );
    expect(normalizeNoteFileName("  folder/lecture-1  ")).toBe(
      "folder/lecture-1.md"
    );
    expect(stripNoteExtension("lecture-1.mdx")).toBe("lecture-1");
    expect(sanitizeNoteTitle('  "# Kinematics!? "  ')).toBe("Kinematics");
  });

  it("parses explicit path destinations from tasks", () => {
    expect(
      parseRequestedNoteDestination(
        'Create note in "Physics/Week 1/lecture-plan.md" about "Vectors"'
      )
    ).toEqual({
      fileName: "lecture-plan.md",
      folderHint: "Physics/Week 1",
      title: "lecture-plan",
    });
  });

  it("parses named notes and separate folder hints", () => {
    expect(
      parseRequestedNoteDestination(
        'Create a note called "Momentum Review" in "Physics/Week 2"'
      )
    ).toEqual({
      fileName: null,
      folderHint: "Physics/Week 2",
      title: "Momentum Review",
    });
  });

  it("builds and strips note headings cleanly", () => {
    expect(
      buildNoteContent({
        title: "Energy Conservation",
        content: "Key idea",
      })
    ).toBe("# Energy Conservation\n\nKey idea\n");

    expect(
      stripLeadingTitleHeading(
        "# Energy Conservation\n\nKey idea\n\nMore detail",
        "Energy Conservation"
      )
    ).toBe("Key idea\n\nMore detail");
  });

  it("extracts tag directives for replace, add, remove, and clear", () => {
    expect(extractTagDirective("tags: physics, mechanics, dynamics")).toEqual({
      action: "replace",
      tags: ["physics", "mechanics", "dynamics"],
    });
    expect(extractTagDirective("add tags vectors, review")).toEqual({
      action: "add",
      tags: ["vectors", "review"],
    });
    expect(extractTagDirective("remove tags review, old")).toEqual({
      action: "remove",
      tags: ["review", "old"],
    });
    expect(extractTagDirective("clear tags")).toEqual({
      action: "replace",
      tags: [],
    });
  });
});
