// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isEmailAddress, SensitiveText } from "./sensitive-text";

describe("isEmailAddress", () => {
  it("accepts common email addresses", () => {
    expect(isEmailAddress("user@domain.tld")).toBe(true);
    expect(isEmailAddress("sub.domain+tag@domain.co")).toBe(true);
  });

  it("trims whitespace before validation", () => {
    expect(isEmailAddress("  user@domain.tld  ")).toBe(true);
    expect(isEmailAddress("\nsub.domain+tag@domain.co\t")).toBe(true);
  });

  it("rejects obvious non-emails", () => {
    expect(isEmailAddress("not-an-email")).toBe(false);
    expect(isEmailAddress("user@")).toBe(false);
    expect(isEmailAddress("@domain.tld")).toBe(false);
    expect(isEmailAddress("user domain.tld")).toBe(false);
  });
});

describe("SensitiveText", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("masks an email-like value in privacy mode and reveals it on click", () => {
    act(() => {
      root.render(
        <SensitiveText privacyMode={true} value="learner@example.com" />
      );
    });

    const revealButton = container.querySelector("button");
    expect(revealButton).not.toBeNull();
    expect(revealButton?.textContent).toBe("learner@example.com");
    expect(revealButton?.querySelector("span")?.className).toContain(
      "blur-[6px]"
    );

    act(() => {
      revealButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).toBe("learner@example.com");
  });

  it("shows the value unmasked when privacy mode is off", () => {
    act(() => {
      root.render(
        <SensitiveText privacyMode={false} value="learner@example.com" />
      );
    });

    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).toBe("learner@example.com");
  });
});
