"use client";

import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import { useDeferredValue, useLayoutEffect, useMemo, useRef } from "react";

import {
  type MessagesProps,
  splitTurnMessages,
  updateChatEdgeMask,
} from "@/components/chat/messages-model";

export function useChatMessages({
  messages,
  messagesContainerRef,
  messagesContentRef,
  status,
}: Pick<
  MessagesProps,
  "messages" | "messagesContainerRef" | "messagesContentRef" | "status"
>) {
  const deferredMessages = useDeferredValue(messages);
  const renderMessages =
    status === "streaming" || status === "submitted"
      ? messages
      : deferredMessages;

  const { lastTurnMessages, pastTurnMessages } = useMemo(
    () => splitTurnMessages(renderMessages),
    [renderMessages]
  );

  const virtualizer = useVirtualizer({
    count: pastTurnMessages.length,
    estimateSize: () => 220,
    getItemKey: (index) => pastTurnMessages[index]?.id ?? index,
    getScrollElement: () => messagesContainerRef.current,
    measureElement,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const pastTurnsHeight = virtualizer.getTotalSize();
  const maskFrameRef = useRef(0);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    const host = container?.parentElement;
    const content = messagesContentRef.current;
    if (!(container && host)) {
      return;
    }

    const updateMask = () => {
      maskFrameRef.current = 0;
      updateChatEdgeMask(host, container);
    };

    const scheduleMaskUpdate = () => {
      if (maskFrameRef.current) {
        return;
      }

      maskFrameRef.current = window.requestAnimationFrame(updateMask);
    };

    updateMask();

    const resizeObserver = new ResizeObserver(scheduleMaskUpdate);
    resizeObserver.observe(container);
    if (content) {
      resizeObserver.observe(content);
    }

    container.addEventListener("scroll", scheduleMaskUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleMaskUpdate, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleMaskUpdate);
      window.removeEventListener("resize", scheduleMaskUpdate);
      host.style.setProperty("--chat-edge-mask-top", "0");
      host.style.setProperty("--chat-edge-mask-bottom", "0");
      if (maskFrameRef.current) {
        window.cancelAnimationFrame(maskFrameRef.current);
        maskFrameRef.current = 0;
      }
    };
  }, [messagesContainerRef, messagesContentRef]);

  return {
    lastTurnMessages,
    measurePastTurnElement: virtualizer.measureElement,
    pastTurnMessages,
    pastTurnsHeight,
    virtualItems,
  };
}
