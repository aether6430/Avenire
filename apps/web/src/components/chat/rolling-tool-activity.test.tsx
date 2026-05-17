"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { groupRollingToolActionsMock, toRollingToolActionMock } = vi.hoisted(
  () => ({
    groupRollingToolActionsMock: vi.fn(() => [
      {
        action: { error: "Broken tool", kind: "error", pending: false },
        type: "mutation",
      },
    ]),
    toRollingToolActionMock: vi.fn(),
  })
);

vi.mock("@/components/chat/rolling-tool-activity-model", () => ({
  groupRollingToolActions: groupRollingToolActionsMock,
  toRollingToolAction: toRollingToolActionMock,
}));

import {
  RollingAgentActivity,
  RollingToolActivity,
} from "@/components/chat/rolling-tool-activity-surface";

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
});
