"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { parseDashboardWorkspaceInvalidationPayload } from "@/components/dashboard/dashboard-sidebar-chat-events-runtime";

type WorkspaceInvalidationKind = "chat" | "files" | "flashcards";

interface WorkspaceInvalidationPayload {
  action?: string | null;
  at?: number | null;
  chat?: unknown;
  chatSlug?: string | null;
  fileId?: string | null;
  folderId?: string | null;
  reason?: string | null;
  workspaceUuid: string;
}

export interface WorkspaceInvalidationDetail {
  kind: WorkspaceInvalidationKind;
  payload?: WorkspaceInvalidationPayload | null;
  workspaceUuid: string;
}

function dispatchWorkspaceInvalidation(detail: WorkspaceInvalidationDetail) {
  window.dispatchEvent(
    new CustomEvent("avenire:workspace-data-invalidated", {
      detail,
    })
  );
}

export function WorkspaceRealtimeBridge({
  workspaceUuid,
}: {
  workspaceUuid: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const realtimeRoute =
      pathname === "/workspace" ||
      pathname.startsWith("/workspace/chats") ||
      pathname.startsWith("/workspace/files") ||
      pathname.startsWith("/workspace/flashcards");

    if (!(workspaceUuid && realtimeRoute)) {
      return;
    }

    let closed = false;
    let eventSource: EventSource | null = null;

    const cleanup = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) {
        return;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      retryTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    const connect = () => {
      if (closed) {
        return;
      }

      try {
        const url = new URL("/api/realtime/events", window.location.origin);
        url.searchParams.set("workspaceUuid", workspaceUuid);
        url.searchParams.set("limit", "100");

        eventSource = new EventSource(url.toString());
        eventSource.onerror = () => {
          cleanup();
          scheduleReconnect();
        };

        const handleInvalidate = (
          kind: WorkspaceInvalidationKind,
          payload?: WorkspaceInvalidationPayload | null
        ) => {
          dispatchWorkspaceInvalidation({ kind, payload, workspaceUuid });

          if (
            kind === "chat" &&
            (pathname.startsWith("/workspace/chats") ||
              pathname === "/workspace")
          ) {
            router.refresh();
          }

          // Mindset screens already handle this via client-side invalidation.
          // Avoid forcing an RSC refresh on every review mutation, which causes
          // duplicate mindset-set fetches and a full remount of the study UI.
        };

        const parsePayload = (event: Event) => {
          if (!(event instanceof MessageEvent)) {
            return null;
          }

          return parseDashboardWorkspaceInvalidationPayload(
            event.data
          ) as WorkspaceInvalidationPayload | null;
        };

        eventSource.addEventListener("files.invalidate", (event) => {
          handleInvalidate("files", parsePayload(event));
        });
        eventSource.addEventListener("chat.invalidate", (event) => {
          handleInvalidate("chat", parsePayload(event));
        });
        eventSource.addEventListener("flashcards.invalidate", () =>
          handleInvalidate("flashcards")
        );
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      closed = true;
      cleanup();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [pathname, router, workspaceUuid]);

  return null;
}
