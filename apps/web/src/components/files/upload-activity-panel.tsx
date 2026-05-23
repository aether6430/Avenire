"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { UploadActivityDesktopSurface } from "./upload-activity-desktop-surface";
import { UploadActivityMobileSurface } from "./upload-activity-mobile-surface";
import { useUploadActivityPanel } from "./use-upload-activity-panel";

const WORKSPACE_FILES_ROUTE_REGEX = /^\/workspace\/files\/([^/]+)/;
export function UploadActivityPanel() {
  const isMobile = useIsMobile();
  const activity = useUploadActivityPanel();

  if (isMobile) {
    return (
      <UploadActivityMobileSurface
        completedCount={activity.completedCount}
        errorMessage={activity.recentJobsErrorMessage}
        failedCount={activity.failedCount}
        isOpen={activity.isQueueVisible}
        loadFailed={activity.recentJobsLoadFailed}
        loading={activity.recentJobsLoading}
        onClearCompleted={activity.handleClearCompleted}
        onClose={activity.handleClose}
        queue={activity.queue}
        uploadCount={activity.uploadCount}
      />
    );
  }

  return (
    <UploadActivityDesktopSurface
      completedCount={activity.completedCount}
      errorMessage={activity.recentJobsErrorMessage}
      failedCount={activity.failedCount}
      isOpen={activity.isQueueVisible}
      loadFailed={activity.recentJobsLoadFailed}
      loading={activity.recentJobsLoading}
      onClearCompleted={activity.handleClearCompleted}
      onClose={activity.handleClose}
      queue={activity.queue}
      uploadCount={activity.uploadCount}
    />
  );
}
