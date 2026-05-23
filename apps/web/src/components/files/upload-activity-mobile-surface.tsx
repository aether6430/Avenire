"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@avenire/ui/components/drawer";
import { UploadActivityBody } from "@/components/files/upload-activity-body";
import { cn } from "@/lib/utils";
import type { FilesActivityItem } from "@/stores/filesActivityStore";

const MOBILE_PANEL_MAX_HEIGHT_CLASS = "max-h-[85svh]";

interface UploadActivityMobileSurfaceProps {
  completedCount: number;
  errorMessage?: string | null;
  failedCount: number;
  isOpen: boolean;
  loadFailed: boolean;
  loading: boolean;
  onClearCompleted: () => void;
  onClose: () => void;
  queue: FilesActivityItem[];
  uploadCount: number;
}

export function UploadActivityMobileSurface({
  completedCount,
  errorMessage,
  failedCount,
  isOpen,
  loadFailed,
  loading,
  onClearCompleted,
  onClose,
  queue,
  uploadCount,
}: UploadActivityMobileSurfaceProps) {
  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
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
          completedCount={completedCount}
          errorMessage={errorMessage}
          failedCount={failedCount}
          loadFailed={loadFailed}
          loading={loading}
          onClearCompleted={onClearCompleted}
          onClose={onClose}
          queue={queue}
          uploadCount={uploadCount}
          useDrawerClose
        />
      </DrawerContent>
    </Drawer>
  );
}
