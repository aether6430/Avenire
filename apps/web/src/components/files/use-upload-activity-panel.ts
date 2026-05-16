"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createIngestionQueueItem,
  type IngestionJobEvent,
  mapIngestionEventStatus,
  mapRecentJobStatus,
  summarizeUploadQueue,
  updateIngestionQueueItem,
  WORKSPACE_FILES_ROUTE_REGEX,
} from "@/components/files/upload-activity-model";
import { usePreferredWorkspaceId } from "@/lib/preferred-workspace-storage";
import { useFilesActivityStore } from "@/stores/filesActivityStore";
import { filesUiActions, useFilesUiStore } from "@/stores/filesUiStore";

async function loadRecentIngestionJobs(input: {
  activeWorkspaceUuid: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(
    `/api/ai/ingestion/jobs?workspaceUuid=${input.activeWorkspaceUuid}&limit=60&windowMinutes=10`,
    { cache: "no-store", signal: input.signal }
  );

  if (!response.ok) {
    throw new Error("Unable to load upload activity.");
  }

  const payload = (await response.json()) as {
    jobs?: Array<{
      fileId: string;
      fileName?: string | null;
      id: string;
      status: "failed" | "queued" | "running" | "succeeded";
    }>;
  };
  return payload.jobs ?? [];
}

export function useUploadActivityPanel() {
  const pathname = usePathname();
  const uploadActivityOpen = useFilesUiStore(
    (state) => state.uploadActivityOpen
  );
  const queuesByWorkspace = useFilesActivityStore(
    (state) => state.queuesByWorkspace
  );
  const updateWorkspaceQueue = useFilesActivityStore(
    (state) => state.updateWorkspaceQueue
  );
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isQueueDismissed, setIsQueueDismissed] = useState(false);
  const [recentJobsLoadFailed, setRecentJobsLoadFailed] = useState(false);
  const preferredWorkspaceId = usePreferredWorkspaceId();
  const previousUploadQueueLengthRef = useRef(0);
  const queueFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ingestionSseRetryTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const ingestionSseCursorRef = useRef<string | null>(null);

  const workspaceFromPath = useMemo(() => {
    const match = pathname.match(WORKSPACE_FILES_ROUTE_REGEX);
    return match?.[1] ?? null;
  }, [pathname]);
  const isFilesRoute = pathname.startsWith("/workspace/files");

  const activeWorkspaceUuid = useMemo(
    () => workspaceFromPath ?? preferredWorkspaceId,
    [preferredWorkspaceId, workspaceFromPath]
  );
  const queue = activeWorkspaceUuid
    ? (queuesByWorkspace[activeWorkspaceUuid] ?? [])
    : [];

  const recentJobsQuery = useQuery({
    enabled: Boolean(activeWorkspaceUuid && isFilesRoute),
    queryFn: ({ signal }) =>
      activeWorkspaceUuid
        ? loadRecentIngestionJobs({ activeWorkspaceUuid, signal })
        : Promise.resolve([]),
    queryKey: ["upload-activity", activeWorkspaceUuid],
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!(activeWorkspaceUuid && isFilesRoute)) {
      return;
    }
    const jobs = recentJobsQuery.data ?? [];
    if (jobs.length === 0) {
      return;
    }

    updateWorkspaceQueue(activeWorkspaceUuid, (previous) => [
      ...previous.filter(
        (item) =>
          !(
            item.ingestionJobId &&
            jobs.some((job) => job.id === item.ingestionJobId)
          )
      ),
      ...jobs
        .filter((job) => Boolean(job.fileName))
        .map((job) => ({
          fileId: job.fileId,
          id: `job:${job.id}`,
          ingestionJobId: job.id,
          name: job.fileName as string,
          sizeLabel: "—",
          status: mapRecentJobStatus(job.status),
        })),
    ]);
  }, [
    activeWorkspaceUuid,
    isFilesRoute,
    recentJobsQuery.data,
    updateWorkspaceQueue,
  ]);

  useEffect(() => {
    setRecentJobsLoadFailed(recentJobsQuery.isError);
  }, [recentJobsQuery.isError]);

  useEffect(() => {
    if (!(activeWorkspaceUuid && isFilesRoute)) {
      return;
    }

    ingestionSseCursorRef.current = null;
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
      if (ingestionSseRetryTimerRef.current) {
        clearTimeout(ingestionSseRetryTimerRef.current);
      }
      ingestionSseRetryTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    const connect = () => {
      if (closed) {
        return;
      }

      try {
        cleanupCurrent();
        const url = new URL(
          "/api/ai/ingestion/jobs/events",
          window.location.origin
        );
        url.searchParams.set("workspaceUuid", activeWorkspaceUuid);
        if (ingestionSseCursorRef.current) {
          url.searchParams.set("cursor", ingestionSseCursorRef.current);
        }

        eventSource = new EventSource(url.toString());
        eventSource.onerror = () => {
          cleanupCurrent();
          scheduleReconnect();
        };
        eventSource.addEventListener("ingestion.job", (event) => {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data) as IngestionJobEvent;
          const cursor =
            typeof messageEvent.lastEventId === "string" &&
            messageEvent.lastEventId.length > 0
              ? messageEvent.lastEventId
              : null;
          if (cursor) {
            ingestionSseCursorRef.current = cursor;
          }

          const status = mapIngestionEventStatus(payload.eventType);

          updateWorkspaceQueue(activeWorkspaceUuid, (previous) => {
            const existingIndex = previous.findIndex(
              (item) => item.ingestionJobId === payload.jobId
            );
            if (existingIndex === -1) {
              const fileName = payload.payload?.fileName;
              if (typeof fileName !== "string" || !fileName) {
                return previous;
              }
              return [
                ...previous,
                createIngestionQueueItem({
                  fileName,
                  jobId: payload.jobId,
                  status,
                }),
              ];
            }

            return previous.map((item, index) => {
              if (index !== existingIndex) {
                return item;
              }
              return updateIngestionQueueItem(item, payload, status);
            });
          });
        });
      } catch {
        scheduleReconnect();
      }
    };

    connect();
    return () => {
      closed = true;
      cleanupCurrent();
      if (ingestionSseRetryTimerRef.current) {
        clearTimeout(ingestionSseRetryTimerRef.current);
        ingestionSseRetryTimerRef.current = null;
      }
    };
  }, [activeWorkspaceUuid, isFilesRoute, updateWorkspaceQueue]);

  useEffect(() => {
    if (queue.length === 0) {
      previousUploadQueueLengthRef.current = 0;
      setIsQueueDismissed(false);
      return;
    }

    if (queue.length > previousUploadQueueLengthRef.current) {
      setIsQueueDismissed(false);
    }

    previousUploadQueueLengthRef.current = queue.length;
  }, [queue.length]);

  useEffect(() => {
    if (uploadActivityOpen) {
      setIsQueueDismissed(false);
    }
  }, [uploadActivityOpen]);

  const queueSummary = useMemo(() => summarizeUploadQueue(queue), [queue]);

  useEffect(() => {
    if (queueFadeTimerRef.current) {
      clearTimeout(queueFadeTimerRef.current);
      queueFadeTimerRef.current = null;
    }

    if (queue.length === 0 && !uploadActivityOpen) {
      setIsQueueVisible(false);
      return;
    }

    if (isQueueDismissed && !uploadActivityOpen) {
      setIsQueueVisible(false);
      return;
    }

    setIsQueueVisible(uploadActivityOpen || queueSummary.hasActiveUploads);

    if (queueSummary.hasActiveUploads || uploadActivityOpen) {
      return;
    }

    queueFadeTimerRef.current = setTimeout(() => {
      setIsQueueVisible(false);
    }, 4500);

    return () => {
      if (queueFadeTimerRef.current) {
        clearTimeout(queueFadeTimerRef.current);
      }
    };
  }, [
    isQueueDismissed,
    queue,
    queueSummary.hasActiveUploads,
    uploadActivityOpen,
  ]);

  const handleClose = () => {
    setIsQueueDismissed(true);
    filesUiActions.setUploadActivityOpen(false);
  };

  const handleClearCompleted = () => {
    if (!activeWorkspaceUuid) {
      return;
    }

    updateWorkspaceQueue(activeWorkspaceUuid, (previous) =>
      previous.filter((item) => item.status !== "uploaded")
    );
  };

  return {
    completedCount: queueSummary.completedCount,
    failedCount: queueSummary.failedCount,
    handleClearCompleted,
    handleClose,
    isQueueVisible,
    queue,
    recentJobsLoadFailed,
    recentJobsLoading: recentJobsQuery.isPending,
    uploadCount: queueSummary.uploadCount,
  };
}
