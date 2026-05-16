import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSettingsOverlayRoute,
  clearWorkspaceSettingsOverlayRoute,
  parseRequestedSettingsTab,
} from "@/components/dashboard/dashboard-overlay-route-model";

describe("dashboard overlay route model", () => {
  it("parses only supported settings tabs", () => {
    expect(parseRequestedSettingsTab("data")).toBe("data");
    expect(parseRequestedSettingsTab("billing")).toBe("billing");
    expect(parseRequestedSettingsTab("unknown")).toBeNull();
    expect(parseRequestedSettingsTab(null)).toBeNull();
    expect(parseRequestedSettingsTab("")).toBeNull();
  });

  it("builds a settings overlay route without dropping unrelated query params", () => {
    const searchParams = new URLSearchParams("prompt=focus&foo=bar");

    expect(
      buildWorkspaceSettingsOverlayRoute({
        pathname: "/workspace/chats/new",
        searchParams,
        tab: "security",
      })
    ).toBe(
      "/workspace/chats/new?prompt=focus&foo=bar&overlay=settings&settingsTab=security"
    );
  });

  it("clears settings overlay params while preserving unrelated query params", () => {
    const searchParams = new URLSearchParams(
      "prompt=focus&overlay=settings&settingsTab=data&foo=bar"
    );

    expect(
      clearWorkspaceSettingsOverlayRoute({
        pathname: "/workspace/chats/new",
        searchParams,
      })
    ).toBe("/workspace/chats/new?prompt=focus&foo=bar");
  });
});
