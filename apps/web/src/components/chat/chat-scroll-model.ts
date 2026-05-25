"use client";

export const PROGRAMMATIC_SCROLL_GRACE_MS = 220;
export const USER_SCROLL_INTENT_WINDOW_MS = 720;
export const AUTO_SCROLL_RESUME_THRESHOLD_PX = 64;
export const TOP_ANCHOR_OFFSET_PX = 96;
export const LAYOUT_SETTLE_MS = 600;

export interface ChatScrollBox {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

export interface ChatScrollMetricSnapshot {
  clientHeight: number;
  paddingBottom: number;
  paddingTop: number;
}

export function getBottomScrollTop(container: ChatScrollBox) {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

export function getDistanceFromBottom(container: ChatScrollBox) {
  return getBottomScrollTop(container) - container.scrollTop;
}

export function isNearBottom(container: ChatScrollBox) {
  return getDistanceFromBottom(container) <= AUTO_SCROLL_RESUME_THRESHOLD_PX;
}

export function escapeChatScrollSelectorValue(value: string) {
  return value.replace(/"/g, '\\"');
}

export function buildChatScrollMetricStyles(
  snapshot: ChatScrollMetricSnapshot
) {
  const innerHeight = Math.max(
    0,
    Math.round(
      snapshot.clientHeight - snapshot.paddingTop - snapshot.paddingBottom
    )
  );

  return {
    "--chat-scroll-h": `${snapshot.clientHeight}px`,
    "--chat-scroll-inner-h": `${innerHeight}px`,
    "--chat-scroll-padding-bottom": `${snapshot.paddingBottom}px`,
    "--chat-scroll-padding-top": `${snapshot.paddingTop}px`,
  };
}

export function shouldIgnoreAutoScrollToggle(input: {
  hasRecentUserIntent: boolean;
  now: number;
  programmaticScrollUntil: number;
}) {
  return (
    input.now < input.programmaticScrollUntil || !input.hasRecentUserIntent
  );
}

export function resolveAutoScrollEnabled(container: ChatScrollBox) {
  return isNearBottom(container);
}

export function isChatScrollIntentKey(key: string) {
  return (
    key === "ArrowDown" ||
    key === "ArrowUp" ||
    key === "PageDown" ||
    key === "PageUp" ||
    key === "Home" ||
    key === "End" ||
    key === " "
  );
}
