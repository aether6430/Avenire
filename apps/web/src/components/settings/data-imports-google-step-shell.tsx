"use client";

import { DataImportsGoogleStep } from "@/components/settings/data-imports-google-step";
import type { DataImportsDestinationRuntime } from "@/components/settings/data-imports-model";
import { useDataImportsGoogle } from "@/components/settings/use-data-imports-google";

export function DataImportsGoogleStepShell({
  destinationRuntime,
}: {
  destinationRuntime: DataImportsDestinationRuntime;
}) {
  const pickerApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY?.trim() ?? "";
  const pickerAppId =
    process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID?.trim() ?? "";

  const googleRuntime = useDataImportsGoogle({
    ensureSavedDestination: destinationRuntime.ensureSavedDestination,
    googleStatus: destinationRuntime.googleStatus,
    hasSelectedDestination: destinationRuntime.hasSelectedDestination,
    loadOverview: destinationRuntime.loadOverview,
    pickerApiKey,
    pickerAppId,
  });

  return (
    <DataImportsGoogleStep
      destinationProps={destinationRuntime.destinationProps}
      driveImporting={googleRuntime.driveImporting}
      driveImportStatus={googleRuntime.driveImportStatus}
      googleImportBlockedReason={googleRuntime.googleImportBlockedReason}
      onConnectGoogleDrive={googleRuntime.connectGoogleDrive}
      onOpenGooglePicker={googleRuntime.handleOpenGooglePicker}
      status={destinationRuntime.googleStatus}
    />
  );
}
