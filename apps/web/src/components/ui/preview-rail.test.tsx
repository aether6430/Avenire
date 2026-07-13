// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewRail } from "./preview-rail";

const ITEMS = [
  { id: "intro", label: "Introduction", level: 1 },
  { id: "details", label: "Details", level: 2 },
  { id: "summary", label: "Summary", level: 1 },
];

describe("PreviewRail", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
      writable: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("exposes the active section and preserves callback navigation", () => {
    const onSelect = vi.fn();

    act(() => {
      root.render(
        <PreviewRail activeId="details" items={ITEMS} onSelect={onSelect} />
      );
    });

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(3);
    expect(buttons.item(1).getAttribute("aria-current")).toBe("location");

    act(() => buttons.item(2).click());
    expect(onSelect).toHaveBeenCalledWith("summary");
  });

  it("moves focus through items with arrow and boundary keys", () => {
    act(() => {
      root.render(<PreviewRail items={ITEMS} onSelect={() => undefined} />);
    });

    const buttons = container.querySelectorAll("button");
    act(() => {
      buttons.item(0).focus();
      buttons
        .item(0)
        .dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" })
        );
    });
    expect(document.activeElement).toBe(buttons.item(2));

    act(() => {
      buttons
        .item(2)
        .dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "Home" })
        );
    });
    expect(document.activeElement).toBe(buttons.item(0));
  });
});
