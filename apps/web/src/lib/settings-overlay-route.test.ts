import { describe, expect, it } from "vitest";
import {
  buildSettingsOverlayRoute,
  clearSettingsOverlayRoute,
  DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH,
  DEFAULT_SETTINGS_BILLING_RETURN_PATH,
  parseRequestedSettingsTab,
} from "@/lib/settings-overlay-route";

describe("settings overlay route", () => {
  it("parses supported settings tabs and rejects unsupported values", () => {
    expect(parseRequestedSettingsTab("data")).toBe("data");
    expect(parseRequestedSettingsTab("security")).toBe("security");
    expect(parseRequestedSettingsTab("tab")).toBeNull();
    expect(parseRequestedSettingsTab(null)).toBeNull();
  });

  it("builds and clears workspace settings overlay routes while preserving unrelated params", () => {
    expect(
      buildSettingsOverlayRoute({
        pathname: "/workspace/chats/new",
        searchParams: new URLSearchParams("prompt=focus&foo=bar"),
        tab: "data",
      })
    ).toBe(
      "/workspace/chats/new?prompt=focus&foo=bar&overlay=settings&settingsTab=data"
    );

    expect(
      clearSettingsOverlayRoute({
        pathname: "/workspace/chats/new",
        searchParams: new URLSearchParams(
          "prompt=focus&overlay=settings&settingsTab=security&foo=bar"
        ),
      })
    ).toBe("/workspace/chats/new?prompt=focus&foo=bar");
  });

  it("keeps billing return paths on live workspace overlay routes", () => {
    expect(DEFAULT_SETTINGS_BILLING_RETURN_PATH).toBe(
      "/workspace?overlay=settings&settingsTab=billing"
    );
    expect(DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH).toBe(
      "/workspace?overlay=settings&settingsTab=billing&checkout=success"
    );
  });
});
