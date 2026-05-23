"use client";

import { Button } from "@avenire/ui/components/button";
import { DrawerClose } from "@avenire/ui/components/drawer";
import {
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  CheckCircle as CheckCircle2,
  Waves,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { Empty } from "@phosphor-icons/react/Empty";
import { Warning as AlertCircle } from "@phosphor-icons/react/Warning";
import type { FilesActivityItem } from "@/stores/filesActivityStore";
import {
  getQueueStatusClass,
  getUploadActivityEmptyState,
} from "./upload-activity-model";

function statusMeta(status: FilesActivityItem["status"]) {
  switch (status) {
    case "queued":
      return {
        icon: <AlertCircle className="size-3.5 text-muted-foreground" />,
        label: "Queued",
        progress: 10,
      };
    case "uploading":
      return {
        icon: <Spinner className="size-3.5" />,
        label: "Uploading",
        progress: 55,
      };
    case "uploaded":
      return {
        icon: <CheckCircle2 className="size-3.5 text-emerald-500" />,
        label: "Uploaded",
        progress: 100,
      };
    case "ingesting":
      return {
        icon: <Spinner className="size-3.5" />,
        label: "Ingesting",
        progress: 80,
      };
    case "failed":
      return {
        icon: <XCircle className="size-3.5 text-destructive" />,
        label: "Failed",
        progress: 100,
      };
    default:
      return {
        icon: <AlertCircle className="size-3.5 text-muted-foreground" />,
        label: "Queued",
        progress: 10,
      };
  }
}

interface UploadActivityBodyProps {
  completedCount: number;
  errorMessage?: string | null;
  failedCount: number;
  loadFailed?: boolean;
  loading?: boolean;
  onClearCompleted?: () => void;
  onClose?: () => void;
  queue: FilesActivityItem[];
  uploadCount: number;
  useDrawerClose?: boolean;
}

export function UploadActivityBody({
  completedCount,
  errorMessage,
  failedCount,
  loadFailed = false,
  loading = false,
  onClearCompleted,
  onClose,
  queue,
  uploadCount,
  useDrawerClose = false,
}: UploadActivityBodyProps) {
  const emptyState = getUploadActivityEmptyState({
    errorMessage,
    itemCount: queue.length,
    loadFailed,
    loading,
  });
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-border/70 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm">Upload activity</p>
            <p className="text-muted-foreground text-xs">
              {queue.length === 0
                ? (emptyState?.title ?? "No recent uploads")
                : `${queue.length} item${queue.length === 1 ? "" : "s"} in this session`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px]">
              <Waves className="size-3" />
              {uploadCount} active
            </span>
            {failedCount > 0 ? (
              <span className="rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                {failedCount} failed
              </span>
            ) : null}
            {onClose && useDrawerClose ? (
              <DrawerClose asChild>
                <Button
                  className="h-7 w-7"
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Close upload activity</span>
                </Button>
              </DrawerClose>
            ) : null}
            {onClose && !useDrawerClose ? (
              <Button
                className="h-7 w-7"
                onClick={onClose}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X className="size-3.5" />
                <span className="sr-only">Close upload activity</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {emptyState ? (
          <Empty className="min-h-[12rem] px-4 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Waves className="size-4" />
              </EmptyMedia>
              <EmptyTitle>{emptyState.title}</EmptyTitle>
              <EmptyDescription>{emptyState.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <div
                  className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3 shadow-sm"
                  key={item.id}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-xs">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {meta.label} • {item.sizeLabel}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        getQueueStatusClass(item.status)
                      )}
                      style={{ width: `${meta.progress}%` }}
                    />
                  </div>
                  {item.error ? (
                    <p className="text-[11px] text-destructive">{item.error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {completedCount > 0 ? (
        <div className="border-border/70 border-t bg-muted/20 px-4 py-3">
          <Button
            className="px-0 text-muted-foreground text-xs hover:text-foreground"
            onClick={onClearCompleted}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear completed
          </Button>
        </div>
      ) : null}
    </div>
  );
}
