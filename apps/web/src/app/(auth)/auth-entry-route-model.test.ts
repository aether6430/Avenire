import { describe, expect, it } from "vitest";
import {
  readSingleAuthSearchParam,
  resolveAuthEntryCallbackURL,
} from "./auth-entry-route-model";

describe("auth entry route model", () => {
  it("reads a single search param value from strings and arrays", () => {
    expect(readSingleAuthSearchParam("value")).toBe("value");
    expect(readSingleAuthSearchParam(["value", "other"])).toBe("value");
    expect(readSingleAuthSearchParam(undefined)).toBeNull();
  });

  it("falls back when callbackURL is empty, external, or self-looping", () => {
    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/workspace",
        value: "",
      })
    ).toBe("/workspace");

    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/workspace",
        value: "https://evil.example",
      })
    ).toBe("/workspace");

    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/workspace",
        value: "/login",
      })
    ).toBe("/workspace");

    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/onboarding",
        value: "/register?callbackURL=/workspace",
      })
    ).toBe("/onboarding");
  });

  it("keeps safe internal callback routes intact", () => {
    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/workspace",
        value: "/share/token-1",
      })
    ).toBe("/share/token-1");

    expect(
      resolveAuthEntryCallbackURL({
        fallback: "/onboarding",
        value: "/workspace/flashcards?create=1",
      })
    ).toBe("/workspace/flashcards?create=1");
  });
});
