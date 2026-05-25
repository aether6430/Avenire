"use client";

import { Spinner } from "@avenire/ui/components/spinner";
import { FileText, Folder, HardDrive, Users } from "@phosphor-icons/react";
import { getWorkspaceUsageValueState } from "@/components/settings/settings-workspace-model";
import type { WorkspaceUsageLike } from "@/components/settings/settings-workspace-selected-sections-types";
import { formatBytes } from "@/components/settings/use-settings-panel";
import { UsageStatCard } from "./settings-panel-content-shared";

export function SettingsWorkspaceStatsSection({
  workspaceUsage,
  workspaceUsageLoadFailed,
  workspaceUsageLoading,
  workspaceUsageStatus,
}: {
  workspaceUsage: WorkspaceUsageLike | null;
  workspaceUsageLoadFailed: boolean;
  workspaceUsageLoading: boolean;
  workspaceUsageStatus: string | null;
}) {
  const storageUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? formatBytes(workspaceUsage.totalSizeBytes)
      : "0 B",
  });
  const filesUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.fileCount.toLocaleString()
      : "0",
  });
  const foldersUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.folderCount.toLocaleString()
      : "0",
  });
  const indexedUsageValue = getWorkspaceUsageValueState({
    loading: workspaceUsageLoading,
    loadFailed: workspaceUsageLoadFailed,
    readyLabel: workspaceUsage
      ? workspaceUsage.indexedFileCount.toLocaleString()
      : "0",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Workspace stats</p>
        <p className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          {workspaceUsageStatus?.startsWith("Loading") ? (
            <Spinner className="size-3.5" />
          ) : null}
          {workspaceUsageStatus ?? "Live workspace totals"}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <UsageStatCard
          description="Total bytes stored across workspace files."
          icon={HardDrive}
          label="Storage Used"
          value={
            storageUsageValue.showSpinner ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-4" />
                {storageUsageValue.label}
              </span>
            ) : (
              storageUsageValue.label
            )
          }
        />
        <UsageStatCard
          description="Files available in this workspace."
          icon={FileText}
          label="Files"
          value={
            filesUsageValue.showSpinner ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-4" />
                {filesUsageValue.label}
              </span>
            ) : (
              filesUsageValue.label
            )
          }
        />
        <UsageStatCard
          description="Nested folders in the workspace tree."
          icon={Folder}
          label="Folders"
          value={
            foldersUsageValue.showSpinner ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-4" />
                {foldersUsageValue.label}
              </span>
            ) : (
              foldersUsageValue.label
            )
          }
        />
        <UsageStatCard
          description={
            workspaceUsage
              ? `${workspaceUsage.pendingIngestionCount.toLocaleString()} pending ingestion`
              : workspaceUsageLoadFailed
                ? "Workspace stats are unavailable right now."
                : "Waiting for ingestion status."
          }
          icon={Users}
          label="Indexed"
          value={
            indexedUsageValue.showSpinner ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-4" />
                {indexedUsageValue.label}
              </span>
            ) : (
              indexedUsageValue.label
            )
          }
        />
      </div>
    </div>
  );
}
