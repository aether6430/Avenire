import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWorkspaceGreeting } from "@/lib/workspace-greeting";

describe("workspace greetings", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps workspace greetings grounded during a normal morning session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T09:15:00.000Z"));

    expect(buildWorkspaceGreeting("Dev User")).toEqual({
      headline: "Dev User, here's what's ready",
      description: "Tasks, recent concepts, and reviews are lined up.",
    });
  });

  it("keeps late-night workspace greetings precise instead of whimsical", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T23:15:00.000Z"));

    expect(buildWorkspaceGreeting("Dev User")).toEqual({
      headline: "Dev User, let's focus the next step",
      description: "This night owl is good for a focused next step.",
    });
  });
});
