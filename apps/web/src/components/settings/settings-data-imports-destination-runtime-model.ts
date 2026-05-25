import {
  buildImportFolderOptions,
  type ImportDestination,
  type ImportProviderStatus,
  resolveImportDestinationWorkspaceId,
  resolveNextImportFolderId,
} from "@/components/settings/data-imports-model";

export function createDataImportsOverviewLoadStartState() {
  return {
    overviewLoading: true,
    overviewStatus: null,
  };
}

export function createDataImportsOverviewLoadSuccessState(input: {
  destination: ImportDestination;
  fallbackWorkspaceId: string;
  googleStatus: ImportProviderStatus | null;
  notionStatus: ImportProviderStatus | null;
}) {
  return {
    destination: input.destination,
    destinationFolderId: input.destination?.folderId ?? "",
    destinationWorkspaceId: resolveImportDestinationWorkspaceId({
      destination: input.destination,
      fallbackWorkspaceId: input.fallbackWorkspaceId,
    }),
    googleStatus: input.googleStatus,
    notionStatus: input.notionStatus,
    overviewLoading: false,
  };
}

export function resolveDataImportsOverviewFailureStatus(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load imports.";
}

export function shouldLoadDestinationFolders(destinationWorkspaceId: string) {
  return Boolean(destinationWorkspaceId);
}

export function createDataImportFoldersResetState() {
  return {
    folderLoadFailed: false,
    folderOptions: [],
  };
}

export function createDataImportFoldersLoadStartState() {
  return {
    folderLoadFailed: false,
    folderLoading: true,
  };
}

export function createDataImportFoldersLoadSuccessState(input: {
  currentFolderId: string;
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    readOnly: boolean;
  }>;
  rootFolderId: string;
}) {
  const folderOptions = buildImportFolderOptions(
    input.rootFolderId,
    input.folders
  );
  return {
    destinationFolderId: resolveNextImportFolderId({
      currentFolderId: input.currentFolderId,
      options: folderOptions,
    }),
    folderLoadFailed: false,
    folderLoading: false,
    folderOptions,
  };
}

export function createDataImportFoldersLoadFailureState(error: unknown) {
  return {
    destinationStatus:
      error instanceof Error ? error.message : "Unable to load folders.",
    folderLoadFailed: true,
    folderLoading: false,
    folderOptions: [],
  };
}

export function shouldReuseSavedImportDestination(input: {
  destination: ImportDestination;
  destinationFolderId: string;
  destinationWorkspaceId: string;
}) {
  return (
    input.destination?.workspaceId === input.destinationWorkspaceId &&
    input.destination?.folderId === input.destinationFolderId
  );
}
