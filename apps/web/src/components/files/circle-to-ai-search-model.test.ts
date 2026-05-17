import { describe, expect, it } from "vitest";
import {
  buildPathData,
  getExpandedSelectionFromPath,
  getMessageTextContent,
  intersectRect,
} from "@/components/files/circle-to-ai-search-model";

describe("circle-to-ai search model", () => {
  it("collects only text message parts and trims the joined text", () => {
    const text = getMessageTextContent({
      parts: [
        { type: "reasoning", text: "ignore me" },
        { text: "  First", type: "text" },
        { type: "tool-invocation" },
        { text: " second  ", type: "text" },
      ],
    } as never);

    expect(text).toBe("First second");
  });

  it("builds a padded selection rectangle from a pointer path", () => {
    expect(
      getExpandedSelectionFromPath([
        { x: 10, y: 10 },
        { x: 30, y: 20 },
        { x: 20, y: 18 },
      ])
    ).toEqual({
      height: 34,
      width: 44,
      x: -2,
      y: -2,
    });
  });

  it("builds a closed svg path for the selection overlay", () => {
    expect(
      buildPathData([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ])
    ).toBe("M 1 2 L 3 4 L 5 6 Z");
  });

  it("returns null for non-overlapping rectangles", () => {
    expect(
      intersectRect({ height: 10, width: 10, x: 0, y: 0 }, {
        height: 5,
        width: 5,
        x: 20,
        y: 20,
      } as DOMRect)
    ).toBeNull();
  });
});
