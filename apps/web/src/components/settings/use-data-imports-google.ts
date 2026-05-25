"use client";

import { linkSocial } from "@avenire/auth/client";
import { useCallback, useEffect, useState } from "react";
import {
  importGoogleDriveFiles,
  loadGooglePickerToken,
} from "@/components/settings/data-imports-client";
import { selectGoogleDriveImportFileIds } from "@/components/settings/data-imports-google-picker";
import {
  getDataImportsCallbackUrl,
  getGoogleImportBlockedReason,
  type ImportDestination,
  type ImportProviderStatus,
} from "@/components/settings/data-imports-model";
import { GOOGLE_IMPORT_SCOPES } from "@/lib/imports-google-scopes";

export function useDataImportsGoogle({
  ensureSavedDestination,
  googleStatus,
  hasSelectedDestination,
  loadOverview,
  pickerApiKey,
  pickerAppId,
}: {
  ensureSavedDestination: () => Promise<ImportDestination>;
  googleStatus: ImportProviderStatus | null;
  hasSelectedDestination: boolean;
  loadOverview: () => Promise<void>;
  pickerApiKey: string;
  pickerAppId: string;
}) {
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveImportStatus, setDriveImportStatus] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (googleStatus?.connected && googleStatus.ready) {
      setDriveImportStatus("Google account connected.");
    }
  }, [googleStatus]);

  const googleImportBlockedReason = getGoogleImportBlockedReason({
    driveImporting,
    hasSelectedDestination,
    pickerApiKey,
    status: googleStatus,
  });

  const connectGoogleDrive = useCallback(async () => {
    setDriveImportStatus("Redirecting to Google...");
    await linkSocial({
      callbackURL: getDataImportsCallbackUrl(),
      provider: "google",
      scopes: GOOGLE_IMPORT_SCOPES,
    });
  }, []);

  const handleOpenGooglePicker = useCallback(async () => {
    if (!pickerApiKey) {
      setDriveImportStatus(
        "Missing NEXT_PUBLIC_GOOGLE_PICKER_API_KEY for Google Picker."
      );
      return;
    }

    setDriveImporting(true);
    setDriveImportStatus("Loading Google Drive Picker...");

    try {
      await ensureSavedDestination();
      const accessToken = await loadGooglePickerToken();
      const fileIds = await selectGoogleDriveImportFileIds({
        accessToken,
        apiKey: pickerApiKey,
        appId: pickerAppId,
      });

      if (fileIds === null) {
        setDriveImportStatus("Google Drive import cancelled.");
        return;
      }

      if (fileIds.length === 0) {
        setDriveImportStatus("No Drive files selected.");
        return;
      }

      setDriveImportStatus("Importing selected Drive files...");
      const imported = await importGoogleDriveFiles(fileIds);
      setDriveImportStatus(
        `Imported ${imported.length} Drive file${imported.length === 1 ? "" : "s"}.`
      );
      await loadOverview();
    } catch (error) {
      setDriveImportStatus(
        error instanceof Error
          ? error.message
          : "Unable to open Google Drive Picker."
      );
    } finally {
      setDriveImporting(false);
    }
  }, [ensureSavedDestination, loadOverview, pickerApiKey, pickerAppId]);

  return {
    connectGoogleDrive,
    driveImporting,
    driveImportStatus,
    googleImportBlockedReason,
    handleOpenGooglePicker,
  };
}
