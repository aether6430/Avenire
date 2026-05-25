"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadDataImportFolders,
  loadDataImportsOverview,
  saveDataImportDestination,
} from "@/components/settings/data-imports-client";
import {
  buildImportDestinationSummaryLabel,
  type DataImportsDestinationRuntime,
  type ImportDestination,
  type ImportProviderStatus,
} from "@/components/settings/data-imports-model";
import {
  createDataImportFoldersLoadFailureState,
  createDataImportFoldersLoadStartState,
  createDataImportFoldersLoadSuccessState,
  createDataImportFoldersResetState,
  createDataImportsOverviewLoadStartState,
  createDataImportsOverviewLoadSuccessState,
  resolveDataImportsOverviewFailureStatus,
  shouldLoadDestinationFolders,
  shouldReuseSavedImportDestination,
} from "@/components/settings/settings-data-imports-destination-runtime-model";
import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";

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
    ReturnType<typeof createDataImportFoldersLoadSuccessState>["folderOptions"]
  >([]);
  const [folderLoadFailed, setFolderLoadFailed] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [destinationStatus, setDestinationStatus] = useState<string | null>(
    null
  );

  const loadOverview = useCallback(async () => {
    const startState = createDataImportsOverviewLoadStartState();
    setOverviewLoading(startState.overviewLoading);
    setOverviewStatus(startState.overviewStatus);

    try {
      const payload = await loadDataImportsOverview();
      const successState = createDataImportsOverviewLoadSuccessState({
        destination: payload.destination,
        fallbackWorkspaceId: workspaces[0]?.workspaceId ?? "",
        googleStatus: payload.providers.google,
        notionStatus: payload.providers.notion,
      });
      setDestination(successState.destination);
      setGoogleStatus(successState.googleStatus);
      setNotionStatus(successState.notionStatus);
      setDestinationWorkspaceId(successState.destinationWorkspaceId);
      setDestinationFolderId(successState.destinationFolderId);
      setOverviewLoading(successState.overviewLoading);
    } catch (error) {
      setOverviewStatus(resolveDataImportsOverviewFailureStatus(error));
      setOverviewLoading(false);
    }
  }, [workspaces]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!shouldLoadDestinationFolders(destinationWorkspaceId)) {
      const resetState = createDataImportFoldersResetState();
      setFolderOptions(resetState.folderOptions);
      setFolderLoadFailed(resetState.folderLoadFailed);
      return;
    }

    let cancelled = false;

    const loadFolders = async () => {
      const startState = createDataImportFoldersLoadStartState();
      setFolderLoading(startState.folderLoading);
      setFolderLoadFailed(startState.folderLoadFailed);

      try {
        const payload = await loadDataImportFolders(destinationWorkspaceId);
        if (cancelled) {
          return;
        }

        const successState = createDataImportFoldersLoadSuccessState({
          currentFolderId: destinationFolderId,
          folders: payload.folders,
          rootFolderId: payload.rootFolderId,
        });
        setFolderOptions(successState.folderOptions);
        setDestinationFolderId(successState.destinationFolderId);
        setFolderLoadFailed(successState.folderLoadFailed);
        setFolderLoading(successState.folderLoading);
      } catch (error) {
        if (!cancelled) {
          const failureState = createDataImportFoldersLoadFailureState(error);
          setFolderLoadFailed(failureState.folderLoadFailed);
          setFolderOptions(failureState.folderOptions);
          setDestinationStatus(failureState.destinationStatus);
          setFolderLoading(failureState.folderLoading);
        }
      }
    };

    void loadFolders();

    return () => {
      cancelled = true;
    };
  }, [destinationFolderId, destinationWorkspaceId]);

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
      shouldReuseSavedImportDestination({
        destination,
        destinationFolderId,
        destinationWorkspaceId,
      })
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
