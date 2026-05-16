import { describe, expect, it } from "vitest";
import {
  shouldLoadChatsForSidebar,
  shouldLoadWorkspaceListOnStartup,
  shouldWarmAllWorkspaceSurfacesOnStartup,
} from "@/components/dashboard/sidebar-startup";

describe("dashboard sidebar startup policy", () => {
  it("does not auto-warm all workspace surfaces on startup", () => {
    expect(shouldWarmAllWorkspaceSurfacesOnStartup("workspace")).toBe(false);
    expect(shouldWarmAllWorkspaceSurfacesOnStartup(null)).toBe(false);
    expect(shouldWarmAllWorkspaceSurfacesOnStartup("files")).toBe(false);
    expect(shouldWarmAllWorkspaceSurfacesOnStartup("chat")).toBe(false);
    expect(shouldWarmAllWorkspaceSurfacesOnStartup("flashcards")).toBe(false);
    expect(shouldWarmAllWorkspaceSurfacesOnStartup("tasks")).toBe(false);
  });

  it("loads chats only when the chat route or chat sidebar is active", () => {
    expect(
      shouldLoadChatsForSidebar({
        isChatsRoute: true,
        sidebarView: "files",
      })
    ).toBe(true);
    expect(
      shouldLoadChatsForSidebar({
        isChatsRoute: false,
        sidebarView: "chat",
      })
    ).toBe(true);
    expect(
      shouldLoadChatsForSidebar({
        isChatsRoute: false,
        sidebarView: "files",
      })
    ).toBe(false);
  });

  it("loads the workspace list on startup only when bootstrap data is absent", () => {
    expect(
      shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: "ready",
        deferredStartupReady: false,
        initialWorkspaceCount: 0,
        workspaceCount: 0,
      })
    ).toBe(false);
    expect(
      shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: "ready",
        deferredStartupReady: true,
        initialWorkspaceCount: 0,
        workspaceCount: 2,
      })
    ).toBe(false);
    expect(
      shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: "loading",
        deferredStartupReady: true,
        initialWorkspaceCount: 0,
        workspaceCount: 0,
      })
    ).toBe(false);
    expect(
      shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: "ready",
        deferredStartupReady: true,
        initialWorkspaceCount: 2,
        workspaceCount: 0,
      })
    ).toBe(false);
    expect(
      shouldLoadWorkspaceListOnStartup({
        bootstrapStatus: "ready",
        deferredStartupReady: true,
        initialWorkspaceCount: 0,
        workspaceCount: 0,
      })
    ).toBe(true);
  });
});
