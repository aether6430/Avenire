// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  buildImportProfile,
  buildInteractionProfile,
  classifyInteractionSurface,
} from "./production-performance-profiler";

describe("production performance profiling", () => {
  it("uses declared surfaces without collecting element text", () => {
    const surface = document.createElement("section");
    surface.dataset.performanceSurface = "chat";
    const button = document.createElement("button");
    button.textContent = "Private prompt text";
    surface.append(button);

    expect(classifyInteractionSurface(button, "/workspace/chats/1")).toBe(
      "chat"
    );
  });

  it("classifies the audited interaction surfaces", () => {
    const editor = document.createElement("div");
    editor.setAttribute("aria-label", "Editor content");
    const editorButton = document.createElement("button");
    editor.append(editorButton);

    const uploadButton = document.createElement("button");
    uploadButton.setAttribute("aria-label", "Upload files");

    expect(classifyInteractionSurface(editorButton, "/workspace/files/1")).toBe(
      "editor"
    );
    expect(classifyInteractionSurface(uploadButton, "/workspace/files/1")).toBe(
      "uploads"
    );
    expect(classifyInteractionSurface(null, "/workspace/chats/1")).toBe("chat");
  });

  it("records only interactions above the production threshold", () => {
    const fastEntry = {
      duration: 40,
      entryType: "event",
      name: "click",
    };
    const slowEntry = {
      duration: 121.6,
      entryType: "event",
      name: "click",
    };

    expect(buildInteractionProfile(fastEntry, "/workspace")).toBeNull();
    expect(buildInteractionProfile(slowEntry, "/workspace")).toEqual({
      durationMs: 122,
      interactionType: "click",
      path: "/workspace",
      surface: "workspace",
    });
  });

  it("profiles only same-origin Next chunks without query strings", () => {
    expect(
      buildImportProfile(
        {
          duration: 17.6,
          initiatorType: "script",
          name: `${window.location.origin}/_next/static/chunks/chat.js?token=private`,
          transferSize: 0,
        },
        "/workspace/chats/chat-1"
      )
    ).toEqual({
      cached: true,
      durationMs: 18,
      initiatorType: "script",
      path: "/workspace/chats/chat-1",
      resourcePath: "/_next/static/chunks/chat.js",
      transferSize: 0,
    });

    expect(
      buildImportProfile(
        {
          duration: 10,
          initiatorType: "script",
          name: "https://cdn.example/private.js",
          transferSize: 12,
        },
        "/workspace"
      )
    ).toBeNull();
  });
});
