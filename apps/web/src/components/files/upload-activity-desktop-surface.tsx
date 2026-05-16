"use client";

import { UploadActivityBody } from "@/components/files/upload-activity-body";
import { cn } from "@/lib/utils";
import type { FilesActivityItem } from "@/stores/filesActivityStore";

const DESKTOP_PANEL_MAX_HEIGHT_CLASS = "max-h-[min(70vh,42rem)]";

interface UploadActivityDesktopSurfaceProps {
  completedCount: number;
  failedCount: number;
  isOpen: boolean;
  loadFailed: boolean;
  loading: boolean;
  onClearCompleted: () => void;
  onClose: () => void;
  queue: FilesActivityItem[];
  uploadCount: number;
}

export function UploadActivityDesktopSurface({
  completedCount,
  failedCount,
  isOpen,
  loadFailed,
  loading,
  onClearCompleted,
  onClose,
  queue,
  uploadCount,
}: UploadActivityDesktopSurfaceProps) {
  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 flex min-h-0 w-[22rem] flex-col overflow-hidden rounded-lg border border-border/70 bg-background transition-all duration-300",
        DESKTOP_PANEL_MAX_HEIGHT_CLASS,
        isOpen
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <UploadActivityBody
        completedCount={completedCount}
        failedCount={failedCount}
        loadFailed={loadFailed}
        loading={loading}
        onClearCompleted={onClearCompleted}
        onClose={onClose}
        queue={queue}
        uploadCount={uploadCount}
      />
    </div>
  );
}
