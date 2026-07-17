import { describe, expect, it } from "vitest";
import {
  shouldUseMultilineComposer,
  TEXTAREA_MULTILINE_HEIGHT,
} from "./composer-layout";

describe("chat composer layout", () => {
  it("expands for a soft-wrapped line measured at the compact width", () => {
    expect(
      shouldUseMultilineComposer({
        measuredHeight: TEXTAREA_MULTILINE_HEIGHT + 1,
        value: "A long line that wraps without an explicit newline",
      })
    ).toBe(true);
  });

  it("keeps explicit newlines expanded", () => {
    expect(
      shouldUseMultilineComposer({
        measuredHeight: TEXTAREA_MULTILINE_HEIGHT,
        value: "First line\nSecond line",
      })
    ).toBe(true);
  });

  it("collapses a short single line", () => {
    expect(
      shouldUseMultilineComposer({
        measuredHeight: TEXTAREA_MULTILINE_HEIGHT,
        value: "Short message",
      })
    ).toBe(false);
  });
});
