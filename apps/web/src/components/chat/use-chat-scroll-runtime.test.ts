import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  applyChatScrollMetrics,
  attachChatScrollIntentListeners,
  type ChatScrollListenerContainer,
  followChatScrollIfNeeded,
  handleLatestUserMessageForScroll,
  INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD,
  initializeChatScrollState,
  schedulePinnedLatestChatMessage,
  shouldEnableInitialChatAutoScroll,
} from "@/components/chat/use-chat-scroll-runtime";

const useChatScrollSource = readFileSync(
  resolve(import.meta.dirname, "./use-chat-scroll.ts"),
  "utf8"
);

function createListenerContainer(
  overrides: Partial<ChatScrollListenerContainer> = {}
) {
  const listeners = new Map<string, EventListener>();
  return {
    addEventListener: vi.fn((name: string, listener: EventListener) => {
      listeners.set(name, listener);
    }),
    clientHeight: 300,
    removeEventListener: vi.fn((name: string) => {
      listeners.delete(name);
    }),
    scrollHeight: 1000,
    scrollTop: 650,
    ...overrides,
    __listeners: listeners,
  } as ChatScrollListenerContainer & {
    __listeners: Map<string, EventListener>;
  };
}

describe("use chat scroll runtime", () => {
  it("applies computed scroll metrics to the container style", () => {
    const setProperty = vi.fn();
    applyChatScrollMetrics({
      container: {
        clientHeight: 420,
        scrollHeight: 0,
        scrollTop: 0,
        style: { setProperty },
      },
      getComputedStyle: () => ({
        paddingBottom: "24px",
        paddingTop: "16px",
      }),
    });

    expect(setProperty).toHaveBeenCalledWith("--chat-scroll-h", "420px");
    expect(setProperty).toHaveBeenCalledWith("--chat-scroll-inner-h", "380px");
  });

  it("follows the scroll only when auto-scroll is enabled, non-streaming, and already near bottom", () => {
    const scrollToBottom = vi.fn();
    expect(
      followChatScrollIfNeeded({
        behavior: "smooth",
        container: { clientHeight: 300, scrollHeight: 1000, scrollTop: 650 },
        isAutoScrollEnabled: true,
        isStreaming: false,
        scrollToBottom,
      })
    ).toBe(true);
    expect(scrollToBottom).toHaveBeenCalledWith("smooth");

    expect(
      followChatScrollIfNeeded({
        container: { clientHeight: 300, scrollHeight: 1000, scrollTop: 200 },
        isAutoScrollEnabled: true,
        isStreaming: false,
        scrollToBottom,
      })
    ).toBe(false);
  });

  it("initializes and resets latest-user scroll state only when needed", () => {
    expect(
      shouldEnableInitialChatAutoScroll({
        isStreaming: false,
        messageCount: INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD,
      })
    ).toBe(false);
    expect(
      shouldEnableInitialChatAutoScroll({
        isStreaming: false,
        messageCount: INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD + 1,
      })
    ).toBe(true);

    expect(
      initializeChatScrollState({
        hasInitializedLayout: false,
        isStreaming: false,
        latestUserMessageId: "user-1",
        messageCount: 2,
      })
    ).toEqual({
      autoScrollEnabled: false,
      hasInitializedLayout: true,
      lastStreamPinnedMessageId: null,
      lastUserMessageId: "user-1",
      shouldScrollToBottom: false,
      shouldScrollToTop: true,
    });

    expect(
      initializeChatScrollState({
        hasInitializedLayout: false,
        isStreaming: false,
        latestUserMessageId: "user-1",
        messageCount: INITIAL_BOTTOM_SCROLL_MESSAGE_THRESHOLD + 1,
      })
    ).toEqual({
      autoScrollEnabled: true,
      hasInitializedLayout: true,
      lastStreamPinnedMessageId: null,
      lastUserMessageId: "user-1",
      shouldScrollToBottom: true,
      shouldScrollToTop: false,
    });

    expect(
      handleLatestUserMessageForScroll({
        hasInitializedLayout: true,
        lastUserMessageId: "user-1",
        latestUserMessageId: "user-2",
      })
    ).toEqual({
      autoScrollEnabled: true,
      lastStreamPinnedMessageId: null,
      lastUserMessageId: "user-2",
    });
  });

  it("schedules pinned latest-user message scrolling only once per stream start", () => {
    const requestAnimationFrame = vi
      .fn<(callback: FrameRequestCallback) => number>()
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const cancelAnimationFrame = vi.fn();
    const scrollToMessageTop = vi.fn();

    const scheduled = schedulePinnedLatestChatMessage({
      cancelAnimationFrame,
      isStreaming: true,
      lastStreamPinnedMessageId: null,
      latestUserMessageId: "user-2",
      requestAnimationFrame,
      scrollToMessageTop,
      wasStreaming: false,
    });

    expect(scheduled?.lastStreamPinnedMessageId).toBe("user-2");
    expect(scrollToMessageTop).toHaveBeenCalledWith("user-2", "smooth");
    scheduled?.cancel();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("attaches chat scroll intent listeners and toggles auto-scroll only on real user-intent scrolls", () => {
    const container = createListenerContainer();
    const markUserIntent = vi.fn();
    const setAutoScrollEnabled = vi.fn();

    const detach = attachChatScrollIntentListeners({
      container,
      getNow: () => 500,
      hasRecentUserIntent: () => true,
      markUserIntent,
      programmaticScrollUntil: 100,
      setAutoScrollEnabled,
    });

    (container.__listeners.get("wheel") as () => void)?.();
    expect(markUserIntent).toHaveBeenCalled();

    (container.__listeners.get("keydown") as (event: KeyboardEvent) => void)?.({
      key: "PageDown",
    } as KeyboardEvent);
    expect(markUserIntent).toHaveBeenCalledTimes(2);

    (container.__listeners.get("scroll") as () => void)?.();
    expect(setAutoScrollEnabled).toHaveBeenCalledWith(true);

    detach();
    expect(container.removeEventListener).toHaveBeenCalled();
  });

  it("wraps requestAnimationFrame and cancelAnimationFrame before handing them to the runtime helper", () => {
    expect(useChatScrollSource).toContain(
      "cancelAnimationFrame: (handle) => {"
    );
    expect(useChatScrollSource).toContain(
      "window.cancelAnimationFrame(handle);"
    );
    expect(useChatScrollSource).toContain(
      "requestAnimationFrame: (callback) => {"
    );
    expect(useChatScrollSource).toContain(
      "return window.requestAnimationFrame(callback);"
    );
    expect(useChatScrollSource).not.toContain(
      "cancelAnimationFrame: window.cancelAnimationFrame"
    );
    expect(useChatScrollSource).not.toContain(
      "requestAnimationFrame: window.requestAnimationFrame"
    );
  });

  it("derives the initial auto-scroll state from the short-thread policy instead of always starting true", () => {
    expect(useChatScrollSource).toContain("shouldEnableInitialChatAutoScroll");
    expect(useChatScrollSource).toContain(
      "const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(() =>"
    );
  });

  it("pins short persisted threads to the top while late layout settles instead of relying on a single initial scroll", () => {
    expect(useChatScrollSource).toContain(
      "const pinTopDuringSettle = useCallback(() => {"
    );
    expect(useChatScrollSource).toContain(
      "const resizeObserver = new ResizeObserver(() => {"
    );
    expect(useChatScrollSource).toContain("container.scrollTo({");
    expect(useChatScrollSource).toContain("top: 0,");
    expect(useChatScrollSource).toContain("pinTopDuringSettle();");
  });
});
