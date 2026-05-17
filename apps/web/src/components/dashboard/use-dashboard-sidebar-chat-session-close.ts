"use client";

import { useEffect, useRef } from "react";
import {
  resolveDashboardChatSessionScope,
  shouldStartDashboardChatSessionCloseTimer,
} from "@/components/dashboard/dashboard-sidebar-chat-events-runtime";
import { sendDashboardSidebarChatSessionClose } from "@/components/dashboard/dashboard-sidebar-runtime-model";
import type { DashboardSidebarView } from "@/components/dashboard/sidebar-startup";

export function useDashboardSidebarChatSessionClose({
  activeChatSlug,
  routeView,
}: {
  activeChatSlug: string;
  routeView: DashboardSidebarView;
}) {
  const sessionCloseRef = useRef<{
    chatId: string;
    sent: boolean;
    sessionId: string;
  } | null>(null);
  const sessionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const clearSessionCloseTimer = () => {
      if (sessionCloseTimerRef.current) {
        clearTimeout(sessionCloseTimerRef.current);
        sessionCloseTimerRef.current = null;
      }
    };

    const startSessionCloseTimer = () => {
      if (sessionCloseRef.current?.sent || !sessionCloseRef.current?.chatId) {
        return;
      }
      if (sessionCloseTimerRef.current) {
        return;
      }

      sessionCloseTimerRef.current = setTimeout(
        () => {
          const scope = sessionCloseRef.current;
          sessionCloseTimerRef.current = null;
          if (!scope || scope.sent || !scope.chatId) {
            return;
          }
          scope.sent = true;
          void sendDashboardSidebarChatSessionClose({
            chatId: scope.chatId,
            sessionId: scope.sessionId,
          }).catch(() => undefined);
        },
        5 * 60 * 1000
      );
    };

    const sendCloseNow = () => {
      const scope = sessionCloseRef.current;
      if (!scope || scope.sent || !scope.chatId) {
        return;
      }

      scope.sent = true;
      void sendDashboardSidebarChatSessionClose({
        chatId: scope.chatId,
        sessionId: scope.sessionId,
      }).catch(() => undefined);
    };

    sessionCloseRef.current = resolveDashboardChatSessionScope({
      activeChatSlug,
      createSessionId: () =>
        globalThis.crypto?.randomUUID?.() ??
        `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      currentScope: sessionCloseRef.current,
      routeView,
    });

    if (routeView === "chat") {
      clearSessionCloseTimer();
    } else if (
      shouldStartDashboardChatSessionCloseTimer({
        routeView,
        scope: sessionCloseRef.current,
        timerActive: Boolean(sessionCloseTimerRef.current),
      })
    ) {
      startSessionCloseTimer();
    }

    const handlePageHide = () => {
      clearSessionCloseTimer();
      sendCloseNow();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (
          shouldStartDashboardChatSessionCloseTimer({
            routeView,
            scope: sessionCloseRef.current,
            timerActive: Boolean(sessionCloseTimerRef.current),
          })
        ) {
          startSessionCloseTimer();
        }
        return;
      }

      clearSessionCloseTimer();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearSessionCloseTimer();
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeChatSlug, routeView]);
}
