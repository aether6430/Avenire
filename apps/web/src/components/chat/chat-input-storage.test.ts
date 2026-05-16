import { describe, expect, it } from "vitest";
import {
  deserializeChatInputDraft,
  serializeChatInputDraft,
} from "./chat-input-storage";

describe("chat input storage", () => {
  it("keeps raw legacy string drafts readable", () => {
    expect(
      deserializeChatInputDraft("c729fdf9-945d-46bf-927b-a86b8ee90a07")
    ).toBe("c729fdf9-945d-46bf-927b-a86b8ee90a07");
  });

  it("keeps JSON-serialized string drafts readable", () => {
    expect(deserializeChatInputDraft('"flashcard prompt"')).toBe(
      "flashcard prompt"
    );
  });

  it("fails closed for structured non-string payloads", () => {
    expect(deserializeChatInputDraft('{"workspaceUuid":"workspace-1"}')).toBe(
      ""
    );
  });

  it("serializes drafts as plain strings", () => {
    expect(serializeChatInputDraft("hello")).toBe("hello");
  });
});
