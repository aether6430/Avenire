"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  buildRollingToolSummaryMock,
  groupRollingToolActionsMock,
  toRollingToolActionMock,
} = vi.hoisted(() => ({
  buildRollingToolSummaryMock: vi.fn(() => "1 read"),
  groupRollingToolActionsMock: vi.fn(() => [
    {
      action: { error: "Broken tool", kind: "error", pending: false },
      type: "mutation",
    },
  ]),
  toRollingToolActionMock: vi.fn(),
}));

vi.mock("@/components/chat/rolling-tool-activity-model", () => ({
  buildRollingToolSummary: buildRollingToolSummaryMock,
  groupRollingToolActions: groupRollingToolActionsMock,
  toRollingToolAction: toRollingToolActionMock,
}));

import {
  RollingAgentActivity,
  RollingToolActivity,
} from "@/components/chat/rolling-tool-activity-body";

describe("rolling tool activity surface", () => {
  it("wires tool parts into grouped body rendering", () => {
    toRollingToolActionMock
      .mockReturnValueOnce({ id: "a" })
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ id: "b" });

    const html = renderToStaticMarkup(
      <RollingToolActivity
        isStreaming
        parts={
          [{ type: "tool-a" }, { type: "tool-b" }, { type: "tool-c" }] as never
        }
      />
    );

    expect(toRollingToolActionMock).toHaveBeenCalledTimes(3);
    expect(groupRollingToolActionsMock).toHaveBeenCalledWith([
      { id: "a" },
      { id: "b" },
    ]);
    expect(html).toContain("Error");
    expect(html).toContain("Broken tool");
  });

  it("wires direct activity actions into grouped body rendering", () => {
    const html = renderToStaticMarkup(
      <RollingAgentActivity
        actions={[{ kind: "error" }] as never}
        isStreaming={false}
      />
    );

    expect(groupRollingToolActionsMock).toHaveBeenCalledWith([
      { kind: "error" },
    ]);
    expect(html).toContain("Error");
    expect(html).toContain("Broken tool");
  });

  it("renders collapsed explore groups with a hidden region until expanded", () => {
    groupRollingToolActionsMock.mockReturnValueOnce([
      {
        items: [
          {
            action: {
              kind: "read",
              pending: false,
              preview: {
                content: "Important excerpt",
                path: "Library/Synthesis.md",
              },
              value: "Library/Synthesis.md",
            },
            label: "Read",
            value: "Library/Synthesis.md",
          },
        ],
        type: "explore",
      },
    ]);

    const html = renderToStaticMarkup(
      <RollingAgentActivity
        actions={[{ kind: "read" }] as never}
        isStreaming={false}
      />
    );

    expect(html).toContain("Explored");
    expect(html).toContain("1 read");
    expect(html).toContain('hidden=""');
    expect(html).toContain("ml-[48px]");
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("w-11");
    expect(html).not.toContain("w-14");
  });
});
