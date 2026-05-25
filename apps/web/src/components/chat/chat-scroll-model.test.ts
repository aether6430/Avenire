import { describe, expect, it } from "vitest";
import {
  buildChatScrollMetricStyles,
  escapeChatScrollSelectorValue,
  getBottomScrollTop,
  getDistanceFromBottom,
  isChatScrollIntentKey,
  isNearBottom,
  resolveAutoScrollEnabled,
  shouldIgnoreAutoScrollToggle,
  TOP_ANCHOR_OFFSET_PX,
} from "@/components/chat/chat-scroll-model";

describe("chat scroll model", () => {
  it("derives bottom scroll positions and near-bottom state", () => {
    const container = {
      clientHeight: 300,
      scrollHeight: 1000,
      scrollTop: 650,
    };

    expect(getBottomScrollTop(container)).toBe(700);
    expect(getDistanceFromBottom(container)).toBe(50);
    expect(isNearBottom(container)).toBe(true);
    expect(resolveAutoScrollEnabled(container)).toBe(true);
  });

  it("escapes message selector values and computes CSS metric vars", () => {
    expect(escapeChatScrollSelectorValue('msg"42')).toBe('msg\\"42');
    expect(
      buildChatScrollMetricStyles({
        clientHeight: 420,
        paddingBottom: 24,
        paddingTop: 16,
      })
    ).toEqual({
      "--chat-scroll-h": "420px",
      "--chat-scroll-inner-h": "380px",
      "--chat-scroll-padding-bottom": "24px",
      "--chat-scroll-padding-top": "16px",
    });
  });

  it("keeps programmatic and non-intent scroll events from toggling auto-follow", () => {
    expect(
      shouldIgnoreAutoScrollToggle({
        hasRecentUserIntent: true,
        now: 100,
        programmaticScrollUntil: 120,
      })
    ).toBe(true);

    expect(
      shouldIgnoreAutoScrollToggle({
        hasRecentUserIntent: false,
        now: 200,
        programmaticScrollUntil: 120,
      })
    ).toBe(true);

    expect(
      shouldIgnoreAutoScrollToggle({
        hasRecentUserIntent: true,
        now: 200,
        programmaticScrollUntil: 120,
      })
    ).toBe(false);
  });

  it("recognizes keyboard inputs that imply user scroll intent", () => {
    expect(isChatScrollIntentKey("PageDown")).toBe(true);
    expect(isChatScrollIntentKey("End")).toBe(true);
    expect(isChatScrollIntentKey("Enter")).toBe(false);
  });

  it("keeps the pinned latest-turn anchor offset high enough to clear the mobile workspace header", () => {
    expect(TOP_ANCHOR_OFFSET_PX).toBe(96);
  });
});
