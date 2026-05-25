"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Spinner } from "@avenire/ui/components/spinner";
import { Warning, WifiHigh, WifiX } from "@phosphor-icons/react";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import type {
  DataImportsDestinationProps,
  ImportProviderStatus,
} from "@/components/settings/data-imports-model";
import { getDataImportFolderStateLabel } from "@/components/settings/data-imports-model";

export function ImportProviderStatusIcon({
  status,
}: {
  status: ImportProviderStatus;
}) {
  if (!(status.configured && status.connected)) {
    return <WifiX className="size-3.5 text-muted-foreground" />;
  }
  if (!status.ready) {
    return <Warning className="size-3.5 text-amber-500" />;
  }
  return <WifiHigh className="size-3.5 text-emerald-500" />;
}

export function DataImportsDestinationFields({
  props,
}: {
  props: DataImportsDestinationProps;
}) {
  const {
    destination,
    destinationFolderId,
    destinationStatus,
    destinationSummaryLabel,
    destinationWorkspaceId,
    folderLoadFailed,
    folderLoading,
    folderOptions,
    hasSelectedDestination,
    onFolderChange,
    onWorkspaceChange,
    selectedFolder,
    selectedWorkspace,
    workspaces,
  } = props;

  return (
    <div className="space-y-3">
      <p className="font-medium text-foreground/70 text-xs">Destination</p>
      <div className="space-y-2">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">Workspace</p>
          <Select
            onValueChange={onWorkspaceChange}
            value={destinationWorkspaceId}
          >
            <SelectTrigger className="h-9 w-full border-border bg-background px-3 text-sm">
              <SelectValue placeholder="Select workspace">
                {selectedWorkspace?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {workspaces.map((workspace) => (
                <SelectItem
                  key={workspace.workspaceId}
                  value={workspace.workspaceId}
                >
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">Folder</p>
          <Select
            disabled={folderLoading || folderOptions.length === 0}
            onValueChange={onFolderChange}
            value={destinationFolderId}
          >
            <SelectTrigger className="h-9 w-full border-border bg-background px-3 text-sm">
              <SelectValue placeholder="Select folder">
                {selectedFolder?.path}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {folderOptions.map((folder) => (
                <SelectItem
                  disabled={folder.readOnly}
                  key={folder.id}
                  value={folder.id}
                >
                  {folder.path}
                  {folder.readOnly ? " (read-only)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0 text-muted-foreground text-xs">
            {folderLoading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-3.5" />
                {getDataImportFolderStateLabel({
                  destination,
                  destinationSummaryLabel,
                  folderLoadFailed,
                  folderLoading,
                  hasSelectedDestination,
                })}
              </span>
            ) : destination ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-600" />
                <span className="truncate">{destinationSummaryLabel}</span>
              </span>
            ) : (
              getDataImportFolderStateLabel({
                destination,
                destinationSummaryLabel,
                folderLoadFailed,
                folderLoading,
                hasSelectedDestination,
              })
            )}
          </div>
          {destinationStatus && !folderLoadFailed ? (
            <p className="text-muted-foreground text-xs">{destinationStatus}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
