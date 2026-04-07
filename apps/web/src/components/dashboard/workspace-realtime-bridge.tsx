"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type WorkspaceInvalidationKind = "chat" | "files" | "flashcards";

interface WorkspaceInvalidationDetail {
  kind: WorkspaceInvalidationKind;
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
    if (!workspaceUuid) {
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
        void connect();
      }, 3000);
    };

    const connect = async () => {
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

        const handleInvalidate = (kind: WorkspaceInvalidationKind) => {
          dispatchWorkspaceInvalidation({ kind, workspaceUuid });

          if (
            kind === "chat" &&
            (pathname.startsWith("/workspace/chats") || pathname === "/workspace")
          ) {
            router.refresh();
          }

          if (kind === "flashcards" && pathname.startsWith("/workspace/flashcards")) {
            router.refresh();
          }
        };

        eventSource.addEventListener("files.invalidate", () =>
          handleInvalidate("files")
        );
        eventSource.addEventListener("chat.invalidate", () =>
          handleInvalidate("chat")
        );
        eventSource.addEventListener("flashcards.invalidate", () =>
          handleInvalidate("flashcards")
        );
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

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
