import { describe, expect, it } from "vitest";

import {
  arePreviewMessagesEqual,
  getReasoningText,
  groupRenderableBlocks,
  type MessagePart,
  type PreviewMessageComparisonInput,
  preferTransientParts,
  splitMessageParts,
  toAgentActivityActions,
} from "@/components/chat/message-model";

describe("message model", () => {
  it("prefers transient tool updates over stable duplicates", () => {
    const parts = preferTransientParts([
      {
        type: "tool-search_workspace",
        toolCallId: "call-1",
      } as unknown as MessagePart,
      {
        transient: true,
        type: "tool-search_workspace",
        toolCallId: "call-1",
      } as unknown as MessagePart,
    ]);

    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ transient: true, toolCallId: "call-1" });
  });

  it("extracts reasoning text and splits rolling activity from renderable parts", () => {
    const reasoning = {
      reasoningText: "Thinking",
      type: "reasoning-step",
    } as unknown as MessagePart;
    const parts = [
      reasoning,
      {
        state: "input-available",
        type: "tool-avenire_agent",
        toolCallId: "agent-1",
      } as unknown as MessagePart,
      {
        state: "output-available",
        type: "tool-show_widget",
        toolCallId: "widget-1",
      } as unknown as MessagePart,
      {
        data: { actions: [], id: "activity-1", status: "running" },
        type: "data-agent_activity",
      } as unknown as MessagePart,
    ];

    expect(getReasoningText(reasoning)).toBe("Thinking");

    const grouped = groupRenderableBlocks(parts);
    expect(grouped).toHaveLength(4);

    const split = splitMessageParts(parts);
    expect(split.rollingToolParts).toHaveLength(1);
    expect(split.agentActivityParts).toHaveLength(1);
    expect(split.remainingParts).toHaveLength(2);
  });

  it("maps structured agent activity and preserves memo guard behavior", () => {
    expect(
      toAgentActivityActions({
        actions: [
          { kind: "edit", path: "foo.ts", pending: true },
          {
            kind: "search",
            pending: false,
            preview: { matches: ["a"], query: "find me" },
            value: "workspace search",
          },
        ],
        id: "activity-1",
        status: "running",
      })
    ).toEqual([
      { kind: "edit", path: "foo.ts", pending: true },
      {
        kind: "search",
        pending: false,
        preview: { matches: ["a"], query: "find me" },
        value: "workspace search",
      },
    ]);

    const shared: PreviewMessageComparisonInput = {
      agentActivity: null,
      isComplete: true,
      isStreaming: false,
      message: {
        id: "msg-1",
        parts: [{ text: "hello", type: "text" }] as unknown as MessagePart[],
        role: "assistant",
      },
      workspaceUuid: "workspace-1",
    };

    expect(
      arePreviewMessagesEqual(shared, {
        ...shared,
        message: {
          ...shared.message,
          parts: [{ text: "hello", type: "text" }],
        },
      })
    ).toBe(true);

    expect(
      arePreviewMessagesEqual(shared, {
        ...shared,
        isStreaming: true,
      })
    ).toBe(false);
  });
});
