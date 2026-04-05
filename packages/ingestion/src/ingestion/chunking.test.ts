import { describe, expect, it } from "vitest";
import { semanticChunkText } from "./chunking";

const makeWordSequence = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index + 1}`).join(" ");

describe("semanticChunkText", () => {
  it("returns no chunks for blank input", () => {
    expect(
      semanticChunkText({
        text: " \n\t ",
        sourceType: "markdown",
        source: "notes.md",
      })
    ).toEqual([]);
  });

  it("groups heading content until an equation block and preserves metadata", () => {
    const chunks = semanticChunkText({
      text: [
        "## Entropy",
        "",
        "Definition of entropy in thermodynamics.",
        "",
        "$$S = k \\ln \\Omega$$",
        "",
        "This paragraph should become its own chunk.",
      ].join("\n"),
      sourceType: "pdf",
      source: "thermo.pdf",
      provider: "manual",
      page: 7,
      startMs: 1200,
      endMs: 2400,
      baseMetadata: {
        topic: "thermodynamics",
      },
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      kind: "concept",
      content: "## Entropy\n\nDefinition of entropy in thermodynamics.",
      metadata: {
        sourceType: "pdf",
        source: "thermo.pdf",
        provider: "manual",
        page: 7,
        startMs: 1200,
        endMs: 2400,
        modality: "text",
        extra: {
          topic: "thermodynamics",
        },
      },
    });
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      content: "$$S = k \\ln \\Omega$$",
    });
    expect(chunks[2]).toMatchObject({
      chunkIndex: 2,
      content: "This paragraph should become its own chunk.",
    });
  });

  it("keeps solved examples grouped until the next heading", () => {
    const chunks = semanticChunkText({
      text: [
        "Worked example: compute the derivative.",
        "",
        "Differentiate x^2 to get 2x.",
        "",
        "## Next topic",
        "",
        "A new concept starts here.",
      ].join("\n"),
      sourceType: "markdown",
      source: "lesson.md",
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      kind: "example",
      content:
        "Worked example: compute the derivative.\n\nDifferentiate x^2 to get 2x.",
    });
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      content: "## Next topic\n\nA new concept starts here.",
    });
  });

  it("infers chunk kinds from the content", () => {
    const cases = [
      { text: "Lemma: therefore the proof is complete.", kind: "proof" },
      { text: "For instance, this example explains the rule.", kind: "example" },
      { text: "Hence the derivation follows from the identity.", kind: "derivation" },
      { text: "Imagine the field lines bending around the charge.", kind: "intuition" },
      { text: "A common mistake is to drop the negative sign.", kind: "mistake" },
      { text: "The diagram below shows the visual arrangement.", kind: "visualization" },
      { text: "Definition: a group is a concept with closure.", kind: "concept" },
      { text: "Plain text with none of the special markers.", kind: "generic" },
    ] as const;

    for (const testCase of cases) {
      const [chunk] = semanticChunkText({
        text: testCase.text,
        sourceType: "markdown",
        source: "lesson.md",
      });

      expect(chunk?.kind).toBe(testCase.kind);
    }
  });

  it("splits oversized paragraphs into overlapping windows and reindexes chunks", () => {
    const chunks = semanticChunkText({
      text: makeWordSequence(340),
      sourceType: "markdown",
      source: "long-note.md",
    });

    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
    expect(chunks[0]?.content.startsWith("word1 word2 word3")).toBe(true);
    expect(chunks[1]?.content.startsWith("word205 word206 word207")).toBe(true);
    expect(chunks[0]?.content.includes("word240")).toBe(true);
    expect(chunks[1]?.content.includes("word340")).toBe(true);
  });
});
