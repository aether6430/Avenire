"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadDataImportFolders,
  loadDataImportsOverview,
  saveDataImportDestination,
} from "@/components/settings/data-imports-client";
import {
  buildImportDestinationSummaryLabel,
  buildImportFolderOptions,
  type DataImportsDestinationRuntime,
  type ImportDestination,
  type ImportProviderStatus,
  resolveImportDestinationWorkspaceId,
  resolveNextImportFolderId,
  type WorkspaceSummary,
} from "@/components/settings/data-imports-model";

export function useDataImportsDestination({
  workspaces,
}: {
  workspaces: WorkspaceSummary[];
}): DataImportsDestinationRuntime {
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewStatus, setOverviewStatus] = useState<string | null>(null);
  const [destination, setDestination] = useState<ImportDestination>(null);
  const [googleStatus, setGoogleStatus] = useState<ImportProviderStatus | null>(
    null
  );
  const [notionStatus, setNotionStatus] = useState<ImportProviderStatus | null>(
    null
  );
  const [destinationWorkspaceId, setDestinationWorkspaceId] = useState(
    workspaces[0]?.workspaceId ?? ""
  );
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [folderOptions, setFolderOptions] = useState<
    ReturnType<typeof buildImportFolderOptions>
  >([]);
  const [folderLoadFailed, setFolderLoadFailed] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [destinationStatus, setDestinationStatus] = useState<string | null>(
    null
  );

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewStatus(null);

    try {
      const payload = await loadDataImportsOverview();
      setDestination(payload.destination);
      setGoogleStatus(payload.providers.google);
      setNotionStatus(payload.providers.notion);
      setDestinationWorkspaceId(
        resolveImportDestinationWorkspaceId({
          destination: payload.destination,
          fallbackWorkspaceId: workspaces[0]?.workspaceId ?? "",
        })
      );
      setDestinationFolderId(payload.destination?.folderId ?? "");
    } catch (error) {
      setOverviewStatus(
        error instanceof Error ? error.message : "Unable to load imports."
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [workspaces]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!destinationWorkspaceId) {
      setFolderOptions([]);
      setFolderLoadFailed(false);
      return;
    }

    let cancelled = false;

    const loadFolders = async () => {
      setFolderLoading(true);
      setFolderLoadFailed(false);

      try {
        const payload = await loadDataImportFolders(destinationWorkspaceId);
        if (cancelled) {
          return;
        }

        const nextOptions = buildImportFolderOptions(
          payload.rootFolderId,
          payload.folders
        );
        setFolderOptions(nextOptions);
        setDestinationFolderId((current) =>
          resolveNextImportFolderId({
            currentFolderId: current,
            options: nextOptions,
          })
        );
      } catch (error) {
        if (!cancelled) {
          setFolderLoadFailed(true);
          setFolderOptions([]);
          setDestinationStatus(
            error instanceof Error ? error.message : "Unable to load folders."
          );
        }
      } finally {
        if (!cancelled) {
          setFolderLoading(false);
        }
      }
    };

    void loadFolders();

    return () => {
      cancelled = true;
    };
  }, [destinationWorkspaceId]);

  const hasSelectedDestination = Boolean(
    destinationWorkspaceId && destinationFolderId
  );

  const selectedFolder = useMemo(
    () =>
      folderOptions.find((entry) => entry.id === destinationFolderId) ?? null,
    [destinationFolderId, folderOptions]
  );
  const selectedWorkspace = useMemo(
    () =>
      workspaces.find(
        (entry) => entry.workspaceId === destinationWorkspaceId
      ) ?? null,
    [destinationWorkspaceId, workspaces]
  );

  const destinationSummaryLabel = useMemo(
    () =>
      buildImportDestinationSummaryLabel({
        destination,
        selectedFolder,
        selectedWorkspace,
      }),
    [destination, selectedFolder, selectedWorkspace]
  );

  const handleWorkspaceChange = useCallback((value: string | null) => {
    setDestinationWorkspaceId(value ?? "");
    setDestinationStatus(null);
  }, []);

  const handleFolderChange = useCallback((value: string | null) => {
    setDestinationFolderId(value ?? "");
    setDestinationStatus(null);
  }, []);

  const ensureSavedDestination = useCallback(async () => {
    if (!(destinationWorkspaceId && destinationFolderId)) {
      throw new Error("Choose and save an import destination first.");
    }

    if (
      destination?.workspaceId === destinationWorkspaceId &&
      destination?.folderId === destinationFolderId
    ) {
      return destination;
    }

    const savedDestination = await saveDataImportDestination({
      folderId: destinationFolderId,
      workspaceId: destinationWorkspaceId,
    });
    setDestination(savedDestination);
    setDestinationStatus("Import destination saved.");
    return savedDestination;
  }, [destination, destinationFolderId, destinationWorkspaceId]);

  const destinationProps = useMemo(
    () => ({
      destination,
      destinationFolderId,
      destinationStatus,
      destinationSummaryLabel,
      destinationWorkspaceId,
      folderLoadFailed,
      folderLoading,
      folderOptions,
      hasSelectedDestination,
      onFolderChange: handleFolderChange,
      onWorkspaceChange: handleWorkspaceChange,
      selectedFolder,
      selectedWorkspace,
      workspaces,
    }),
    [
      destination,
      destinationFolderId,
      destinationStatus,
      destinationSummaryLabel,
      destinationWorkspaceId,
      folderLoadFailed,
      folderLoading,
      folderOptions,
      handleFolderChange,
      handleWorkspaceChange,
      hasSelectedDestination,
      selectedFolder,
      selectedWorkspace,
      workspaces,
    ]
  );

  return {
    destinationProps,
    ensureSavedDestination,
    googleStatus,
    hasSelectedDestination,
    loadOverview,
    notionStatus,
    overviewLoading,
    overviewStatus,
  };
}
