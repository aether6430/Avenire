"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { Globe, LinkIcon } from "@phosphor-icons/react";
import { DownloadSimple as Download } from "@phosphor-icons/react/DownloadSimple";
import type { DataImportsGoogleStepProps } from "./data-imports-model";
import {
  EMPTY_IMPORT_PROVIDER_STATUS,
  getImportProviderStateLabel,
} from "./data-imports-model";
import {
  DataImportsDestinationFields,
  ImportProviderStatusIcon,
} from "./data-imports-shared";

export function DataImportsGoogleStep({
  destinationProps,
  driveImporting,
  driveImportStatus,
  googleImportBlockedReason,
  onConnectGoogleDrive,
  onOpenGooglePicker,
  status,
}: DataImportsGoogleStepProps) {
  const resolvedStatus = status ?? EMPTY_IMPORT_PROVIDER_STATUS;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40">
          <Globe className="size-4 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Google Drive</p>
            <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5">
              <ImportProviderStatusIcon status={resolvedStatus} />
              <span className="text-[11px] text-muted-foreground">
                {getImportProviderStateLabel(status)}
              </span>
            </div>
          </div>
          {status?.accountId ? (
            <p className="mt-0.5 text-muted-foreground text-xs">
              {status.accountId}
            </p>
          ) : null}
          {driveImportStatus ? (
            <p className="mt-1 text-muted-foreground text-xs">
              {driveImportStatus}
            </p>
          ) : null}
        </div>
        <Button
          disabled={!status?.configured}
          onClick={() => void onConnectGoogleDrive()}
          size="sm"
          type="button"
          variant={status?.ready ? "outline" : "default"}
        >
          <LinkIcon className="size-3.5" />
          {status?.connected ? "Reconnect" : "Connect"}
        </Button>
      </div>

      {status?.ready ? (
        <DataImportsDestinationFields props={destinationProps} />
      ) : null}

      <div className="flex items-center justify-between gap-3 border-border/50 border-t pt-4">
        {googleImportBlockedReason && !status?.ready ? (
          <p className="text-muted-foreground text-xs">
            {googleImportBlockedReason}
          </p>
        ) : null}
        <div className="ml-auto">
          <Button
            disabled={Boolean(googleImportBlockedReason)}
            onClick={() => void onOpenGooglePicker()}
            size="sm"
            type="button"
          >
            {driveImporting ? (
              <Spinner className="size-3.5" />
            ) : (
              <Download className="size-3.5" />
            )}
            Import from Drive
          </Button>
        </div>
      </div>
    </div>
  );
}
