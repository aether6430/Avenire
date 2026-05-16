"use client";

import { useEffect, useRef } from "react";
import {
  applyExplorerIngestionJobEvent,
  parseExplorerFilesInvalidationPayload,
  parseExplorerIngestionJobEventPayload,
} from "@/components/files/explorer/explorer-realtime-model";
import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";
import { invalidateWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import { invalidateWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";

interface UseExplorerRealtimeSyncOptions {
  enabled: boolean;
  refreshDataDebounced: () => void;
  setUploadQueue: (
    updater:
      | ExplorerUploadQueueItem[]
      | ((previous: ExplorerUploadQueueItem[]) => ExplorerUploadQueueItem[])
  ) => void;
  workspaceUuid: string;
}

export function useExplorerRealtimeSync({
  enabled,
  refreshDataDebounced,
  setUploadQueue,
  workspaceUuid,
}: UseExplorerRealtimeSyncOptions) {
  const filesInvalidateRetryTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const ingestionRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!(enabled && workspaceUuid)) {
      return;
    }

    let closed = false;
    let eventSource: EventSource | null = null;

    const cleanupCurrent = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) {
        return;
      }

      if (filesInvalidateRetryTimerRef.current) {
        clearTimeout(filesInvalidateRetryTimerRef.current);
      }

      filesInvalidateRetryTimerRef.current = setTimeout(() => {
        void connect();
      }, 3000);
    };

    const connect = async () => {
      if (closed) {
        return;
      }

      try {
        cleanupCurrent();

        const url = new URL("/api/realtime/events", window.location.origin);
        url.searchParams.set("eventType", "files.invalidate");
        url.searchParams.set("limit", "100");
        url.searchParams.set("workspaceUuid", workspaceUuid);

        eventSource = new EventSource(url.toString());
        eventSource.onerror = () => {
          cleanupCurrent();
          scheduleReconnect();
        };
        eventSource.addEventListener("files.invalidate", (event) => {
          const detail = parseExplorerFilesInvalidationPayload(
            (event as MessageEvent<string>).data
          );

          invalidateWorkspaceFolderCache(workspaceUuid, detail?.folderId);
          invalidateWorkspaceMarkdownCache(workspaceUuid);
          refreshDataDebounced();
        });
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      closed = true;
      cleanupCurrent();
      if (filesInvalidateRetryTimerRef.current) {
        clearTimeout(filesInvalidateRetryTimerRef.current);
        filesInvalidateRetryTimerRef.current = null;
      }
    };
  }, [enabled, refreshDataDebounced, workspaceUuid]);

  useEffect(() => {
    if (!(enabled && workspaceUuid)) {
      return;
    }

    let closed = false;
    let eventSource: EventSource | null = null;

    const cleanupCurrent = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) {
        return;
      }

      if (ingestionRetryTimerRef.current) {
        clearTimeout(ingestionRetryTimerRef.current);
      }

      ingestionRetryTimerRef.current = setTimeout(() => {
        void connect();
      }, 3000);
    };

    const connect = async () => {
      if (closed) {
        return;
      }

      try {
        cleanupCurrent();
        const url = new URL(
          "/api/ai/ingestion/jobs/events",
          window.location.origin
        );
        url.searchParams.set("workspaceUuid", workspaceUuid);

        eventSource = new EventSource(url.toString());
        eventSource.onerror = () => {
          cleanupCurrent();
          scheduleReconnect();
        };

        eventSource.addEventListener("ingestion.job", (event) => {
          const payload = parseExplorerIngestionJobEventPayload(
            (event as MessageEvent<string>).data
          );
          if (!payload) {
            return;
          }

          setUploadQueue((previous) =>
            applyExplorerIngestionJobEvent(previous, payload)
          );

          if (
            payload.eventType === "job.succeeded" ||
            payload.eventType === "job.failed"
          ) {
            refreshDataDebounced();
          }
        });
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      closed = true;
      cleanupCurrent();
      if (ingestionRetryTimerRef.current) {
        clearTimeout(ingestionRetryTimerRef.current);
        ingestionRetryTimerRef.current = null;
      }
    };
  }, [enabled, refreshDataDebounced, setUploadQueue, workspaceUuid]);
}
