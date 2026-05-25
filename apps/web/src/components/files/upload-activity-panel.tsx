"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@avenire/ui/components/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { UploadActivityBody } from "./upload-activity-body";
import { useUploadActivityPanel } from "./use-upload-activity-panel";

const WORKSPACE_FILES_ROUTE_REGEX = /^\/workspace\/files\/([^/]+)/;
const DESKTOP_PANEL_MAX_HEIGHT_CLASS = "max-h-[min(70vh,42rem)]";
const MOBILE_PANEL_MAX_HEIGHT_CLASS = "max-h-[85svh]";

export function UploadActivityPanel() {
  const isMobile = useIsMobile();
  const activity = useUploadActivityPanel();

  if (isMobile) {
    return (
      <Drawer
        onOpenChange={(open) => {
          if (!open) {
            activity.handleClose();
          }
        }}
        open={activity.isQueueVisible}
      >
        <DrawerContent
          className={cn(
            "flex min-h-0 flex-col p-0",
            MOBILE_PANEL_MAX_HEIGHT_CLASS
          )}
        >
          <DrawerHeader className="border-border/70 border-b pb-4 text-left">
            <DrawerTitle>Upload activity</DrawerTitle>
            <DrawerDescription>
              Track uploads, ingestion, and failures without leaving the
              workspace.
            </DrawerDescription>
          </DrawerHeader>
          <UploadActivityBody
            completedCount={activity.completedCount}
            errorMessage={activity.recentJobsErrorMessage}
            failedCount={activity.failedCount}
            loadFailed={activity.recentJobsLoadFailed}
            loading={activity.recentJobsLoading}
            onClearCompleted={activity.handleClearCompleted}
            onClose={activity.handleClose}
            queue={activity.queue}
            uploadCount={activity.uploadCount}
            useDrawerClose
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 flex min-h-0 w-[22rem] flex-col overflow-hidden rounded-lg border border-border/70 bg-background transition-all duration-300",
        DESKTOP_PANEL_MAX_HEIGHT_CLASS,
        activity.isQueueVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <UploadActivityBody
        completedCount={activity.completedCount}
        errorMessage={activity.recentJobsErrorMessage}
        failedCount={activity.failedCount}
        loadFailed={activity.recentJobsLoadFailed}
        loading={activity.recentJobsLoading}
        onClearCompleted={activity.handleClearCompleted}
        onClose={activity.handleClose}
        queue={activity.queue}
        uploadCount={activity.uploadCount}
      />
    </div>
  );
}
