import { describe, expect, it, vi } from "vitest";
import {
  getStreamKey,
  toPositiveInt,
  toWorkspaceEvent,
} from "@/lib/workspace-event-stream-model";

describe("workspace event stream model", () => {
  it("builds stream keys and positive integer config values", () => {
    expect(getStreamKey("workspace-1")).toBe("workspace:events:workspace-1");
    expect(toPositiveInt("25", 10)).toBe(25);
    expect(toPositiveInt("0", 10)).toBe(10);
    expect(toPositiveInt(undefined, 10)).toBe(10);
  });

  it("parses valid redis stream entries into workspace events", () => {
    const event = toWorkspaceEvent("workspace-1", [
      "1716650000-0",
      [
        "type",
        "file.updated",
        "payload",
        '{"fileId":"file-1"}',
        "ts",
        "1716650000000",
        "requestId",
        "req-1",
      ],
    ]);

    expect(event).toEqual({
      payload: { fileId: "file-1" },
      requestId: "req-1",
      streamId: "1716650000-0",
      ts: 1_716_650_000_000,
      type: "file.updated",
      workspaceUuid: "workspace-1",
    });
  });

  it("fails closed on malformed entries and preserves raw payload text when json is invalid", () => {
    expect(toWorkspaceEvent("workspace-1", null)).toBeNull();

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123);
    const event = toWorkspaceEvent("workspace-1", [
      "1716650000-0",
      ["payload", "{broken", "requestId", ""],
    ]);

    expect(event).toEqual({
      payload: { raw: "{broken" },
      requestId: null,
      streamId: "1716650000-0",
      ts: 123,
      type: "workspace.event",
      workspaceUuid: "workspace-1",
    });
    nowSpy.mockRestore();
  });
});
