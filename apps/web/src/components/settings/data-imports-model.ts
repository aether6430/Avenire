"use client";

import type { WorkspaceSummary } from "@/components/settings/settings-panel-model";

export type { WorkspaceSummary } from "@/components/settings/settings-panel-model";

export interface ImportProviderStatus {
  accountId: string | null;
  configured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
  hasUsableAccessToken: boolean;
  ready: boolean;
  scopes: string[];
}

export type ImportDestination = {
  createdAt: string;
  folderId: string;
  folderName: string;
  id: string;
  label: string;
  organizationId: string;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
} | null;

export interface ImportPage {
  id: string;
  lastEditedTime: string;
  title: string;
  url: string | null;
}

export interface FolderOption {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  readOnly: boolean;
}

export type SelectedImportSource = "google" | "notion" | null;

export interface DataImportsDestinationProps {
  destination: ImportDestination;
  destinationFolderId: string;
  destinationStatus: string | null;
  destinationSummaryLabel: string;
  destinationWorkspaceId: string;
  folderLoadFailed: boolean;
  folderLoading: boolean;
  folderOptions: FolderOption[];
  hasSelectedDestination: boolean;
  onFolderChange: (value: string | null) => void;
  onWorkspaceChange: (value: string | null) => void;
  selectedFolder: FolderOption | null;
  selectedWorkspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
}

export interface DataImportsSourcePickerProps {
  googleStatus: ImportProviderStatus | null;
  notionStatus: ImportProviderStatus | null;
  onSelect: (source: "google" | "notion") => void;
}

export interface DataImportsGoogleStepProps {
  destinationProps: DataImportsDestinationProps;
  driveImporting: boolean;
  driveImportStatus: string | null;
  googleImportBlockedReason: string | null;
  onConnectGoogleDrive: () => Promise<void>;
  onOpenGooglePicker: () => Promise<void>;
  status: ImportProviderStatus | null;
}

export interface DataImportsNotionStepProps {
  destinationProps: DataImportsDestinationProps;
  notionImporting: boolean;
  notionImportStatus: string | null;
  notionLoading: boolean;
  notionPages: ImportPage[];
  onConnectNotion: () => Promise<void>;
  onImportSelectedNotionPages: () => Promise<void>;
  onLoadNotionPages: () => Promise<void>;
  onToggleNotionPage: (pageId: string) => void;
  selectedNotionPageIds: string[];
  selectedPagesCount: number;
  status: ImportProviderStatus | null;
}

export interface DataImportsDestinationRuntime {
  destinationProps: DataImportsDestinationProps;
  ensureSavedDestination: () => Promise<ImportDestination>;
  googleStatus: ImportProviderStatus | null;
  hasSelectedDestination: boolean;
  loadOverview: () => Promise<void>;
  notionStatus: ImportProviderStatus | null;
  overviewLoading: boolean;
  overviewStatus: string | null;
}

export interface DataImportsSurfaceProps {
  destinationRuntime: DataImportsDestinationRuntime;
  onBack: () => void;
  onSelectSource: (source: "google" | "notion") => void;
  selectedSource: SelectedImportSource;
}

export const EMPTY_IMPORT_PROVIDER_STATUS: ImportProviderStatus = {
  accountId: null,
  configured: false,
  connected: false,
  hasRefreshToken: false,
  hasUsableAccessToken: false,
  ready: false,
  scopes: [],
};

export function formatImportTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function buildImportFolderOptions(
  rootFolderId: string,
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    readOnly: boolean;
  }>
) {
  const byId = new Map(
    folders.map((folder) => [folder.id, { ...folder, path: folder.name }])
  );

  const buildPath = (folderId: string): string => {
    const current = byId.get(folderId);
    if (!current) {
      return "";
    }
    if (!current.parentId || current.id === rootFolderId) {
      return current.name;
    }

    const parentPath = buildPath(current.parentId);
    return parentPath ? `${parentPath} / ${current.name}` : current.name;
  };

  return folders
    .map((folder) => ({
      ...folder,
      path: buildPath(folder.id),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function resolveImportDestinationWorkspaceId(options: {
  destination: ImportDestination;
  fallbackWorkspaceId: string;
}) {
  return options.destination?.workspaceId ?? options.fallbackWorkspaceId;
}

export function resolveNextImportFolderId(options: {
  currentFolderId: string;
  options: FolderOption[];
}) {
  if (options.options.some((entry) => entry.id === options.currentFolderId)) {
    return options.currentFolderId;
  }

  return options.options.find((entry) => !entry.readOnly)?.id ?? "";
}

export function buildImportDestinationSummaryLabel(input: {
  destination: ImportDestination;
  selectedFolder: FolderOption | null;
  selectedWorkspace: WorkspaceSummary | null;
}) {
  return `${input.selectedWorkspace?.name ?? input.destination?.workspaceName ?? "Workspace"} / ${
    input.selectedFolder?.path ?? input.destination?.folderName ?? "Folder"
  }`;
}

export function getDataImportsCallbackUrl() {
  if (typeof window === "undefined") {
    return "/workspace?overlay=settings&settingsTab=data";
  }

  const url = new URL(window.location.href);
  url.searchParams.set("overlay", "settings");
  url.searchParams.set("settingsTab", "data");
  return url.toString();
}

export function getDataImportFolderStateLabel(input: {
  destination: ImportDestination;
  destinationSummaryLabel: string;
  folderLoadFailed: boolean;
  folderLoading: boolean;
  hasSelectedDestination: boolean;
}) {
  if (input.folderLoading) {
    return "Loading folders...";
  }

  if (input.folderLoadFailed) {
    return "Unable to load folders.";
  }

  if (input.destination) {
    return input.destinationSummaryLabel;
  }

  if (input.hasSelectedDestination) {
    return "Will save on import";
  }

  return "No folder selected";
}

export function getImportProviderStateLabel(
  status: ImportProviderStatus | null
) {
  if (status?.ready) {
    return "Ready";
  }
  if (status?.connected) {
    return "Reconnect required";
  }
  return "Not linked";
}

export function getGoogleImportBlockedReason({
  driveImporting,
  hasSelectedDestination,
  pickerApiKey,
  status,
}: {
  driveImporting: boolean;
  hasSelectedDestination: boolean;
  pickerApiKey: string;
  status: ImportProviderStatus | null;
}) {
  if (driveImporting) {
    return "Google Drive import is in progress.";
  }
  if (!status?.ready) {
    return "Reconnect Google to continue.";
  }
  if (!hasSelectedDestination) {
    return "Choose a destination folder first.";
  }
  if (!pickerApiKey) {
    return "Set NEXT_PUBLIC_GOOGLE_PICKER_API_KEY and restart the web app.";
  }
  return null;
}
