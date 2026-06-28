import { describe, expect, it } from "vitest";
import type { UIMessage } from "@avenire/ai/message-types";
import {
  CHAT_TOOL_APPROVAL_POLICY,
  requiresChatToolApproval,
  stripUnconfiguredToolApprovalParts,
} from "./chat-tool-approval-policy";

describe("CHAT_TOOL_APPROVAL_POLICY", () => {
  it("requires approvals only for deleting or moving workspace files", () => {
    expect(CHAT_TOOL_APPROVAL_POLICY).toEqual({
      delete_file: "user-approval",
      move_file: "user-approval",
    });
  });

  it("does not require approvals for note updates or flashcard generation", () => {
    expect(CHAT_TOOL_APPROVAL_POLICY).not.toHaveProperty("update_note");
    expect(CHAT_TOOL_APPROVAL_POLICY).not.toHaveProperty("update_note_tags");
    expect(CHAT_TOOL_APPROVAL_POLICY).not.toHaveProperty("generate_flashcards");
    expect(CHAT_TOOL_APPROVAL_POLICY).not.toHaveProperty(
      "generate_flashcards_from_misconception"
    );
  });

  it("reports approval requirements from the central policy", () => {
    expect(requiresChatToolApproval("delete_file")).toBe(true);
    expect(requiresChatToolApproval("move_file")).toBe(true);
    expect(requiresChatToolApproval("update_note")).toBe(false);
    expect(requiresChatToolApproval("generate_flashcards")).toBe(false);
  });

  it("strips stale approval parts for tools that no longer require approval", () => {
    const messages = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "tool-update_note",
            state: "approval-requested",
            toolCallId: "functions.update_note:3",
            input: { fileId: "note-1" },
            approval: { id: "old-update-note-approval" },
          },
          {
            type: "tool-delete_file",
            state: "approval-requested",
            toolCallId: "functions.delete_file:1",
            input: { fileId: "file-1" },
            approval: { id: "delete-file-approval" },
          },
          {
            type: "tool-generate_flashcards",
            state: "output-available",
            toolCallId: "functions.generate_flashcards:6",
            input: { title: "Kinematics" },
            output: { setId: "set-1" },
          },
        ],
      },
      {
        id: "user-1",
        role: "user",
        parts: [
          {
            type: "tool-update_note",
            state: "approval-responded",
            toolCallId: "functions.update_note:3",
            input: { fileId: "note-1" },
            approval: {
              approved: true,
              id: "old-update-note-approval",
            },
          },
          {
            type: "text",
            text: "continue",
          },
        ],
      },
    ] as unknown as UIMessage[];

    const stripped = stripUnconfiguredToolApprovalParts(messages);

    expect(stripped).not.toBe(messages);
    expect(stripped[0]?.parts).toEqual([
      {
        type: "tool-delete_file",
        state: "approval-requested",
        toolCallId: "functions.delete_file:1",
        input: { fileId: "file-1" },
        approval: { id: "delete-file-approval" },
      },
      {
        type: "tool-generate_flashcards",
        state: "output-available",
        toolCallId: "functions.generate_flashcards:6",
        input: { title: "Kinematics" },
        output: { setId: "set-1" },
      },
    ]);
    expect(stripped[1]?.parts).toEqual([
      {
        type: "text",
        text: "continue",
      },
    ]);
  });
});
