"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Checkbox } from "@avenire/ui/components/checkbox";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Separator } from "@avenire/ui/components/separator";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  ArrowClockwise as Refresh,
  CheckCircle,
  DownloadSimple as Download,
  Folder,
  Globe,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { linkSocial } from "@avenire/auth/client";
import { useEffect, useMemo, useState } from "react";
import { GOOGLE_IMPORT_SCOPES } from "@/lib/imports-shared";

type WorkspaceSummary = {
  logo: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
};

type ImportProviderStatus = {
  accountId: string | null;
  configured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
  hasUsableAccessToken: boolean;
  ready: boolean;
  scopes: string[];
};

type ImportDestination = {
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

type ImportPage = {
  id: string;
  lastEditedTime: string;
  title: string;
  url: string | null;
};

type FolderOption = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  readOnly: boolean;
};

declare global {
  interface Window {
    gapi?: {
      load: (
        name: string,
        options:
          | (() => void)
          | { callback?: () => void; onerror?: () => void },
      ) => void;
    };
    google?: {
      picker?: {
        Action: { PICKED: string };
        DocsView: new (
          viewId: unknown,
        ) => {
          setIncludeFolders: (value: boolean) => unknown;
          setMode: (value: unknown) => unknown;
          setSelectFolderEnabled: (value: boolean) => unknown;
        };
        DocsViewMode: { LIST: unknown };
        Feature: { MULTISELECT_ENABLED: unknown };
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          enableFeature: (feature: unknown) => unknown;
          setAppId: (appId: string) => unknown;
          setCallback: (callback: (data: any) => void) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setOAuthToken: (token: string) => unknown;
          build: () => { setVisible: (value: boolean) => void };
        };
        Response: { ACTION: string; DOCUMENTS: string };
        ViewId: { DOCS: unknown };
      };
    };
  }
}

function ProviderBadge({ status }: { status: ImportProviderStatus }) {
  if (!status.configured) {
    return <Badge variant="secondary">Not configured</Badge>;
  }
  if (!status.connected) {
    return <Badge variant="secondary">Not connected</Badge>;
  }
  if (!status.ready) {
    return <Badge variant="outline">Reconnect required</Badge>;
  }
  return <Badge variant="default">Ready</Badge>;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildFolderOptions(
  rootFolderId: string,
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    readOnly: boolean;
  }>,
) {
  const byId = new Map(
    folders.map((folder) => [
      folder.id,
      { ...folder, path: folder.name },
    ]),
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

function getProviderSummary(status: ImportProviderStatus | null) {
  if (!status?.configured) {
    return "Not configured";
  }
  if (!status.connected) {
    return "Not connected";
  }
  if (!status.ready) {
    return "Reconnect required";
  }
  return status.accountId ? `Linked as ${status.accountId}` : "Connected";
}

function getSettingsDataCallbackUrl() {
  if (typeof window === "undefined") {
    return "/workspace?overlay=settings&settingsTab=data";
  }

  const url = new URL(window.location.href);
  url.searchParams.set("overlay", "settings");
  url.searchParams.set("settingsTab", "data");
  return url.toString();
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is unavailable."));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Unable to load ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

async function ensureGooglePickerLoaded() {
  await loadScript("https://apis.google.com/js/api.js");

  if (typeof window === "undefined" || !window.gapi) {
    throw new Error("Google Picker library is unavailable.");
  }

  await new Promise<void>((resolve, reject) => {
    window.gapi?.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("Unable to initialize Google Picker.")),
    });
  });
}

export function DataImportsSection({
  workspaces,
}: {
  workspaces: WorkspaceSummary[];
}) {
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewStatus, setOverviewStatus] = useState<string | null>(null);
  const [destination, setDestination] = useState<ImportDestination>(null);
  const [googleStatus, setGoogleStatus] = useState<ImportProviderStatus | null>(
    null,
  );
  const [notionStatus, setNotionStatus] = useState<ImportProviderStatus | null>(
    null,
  );
  const [destinationWorkspaceId, setDestinationWorkspaceId] = useState(
    workspaces[0]?.workspaceId ?? "",
  );
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [destinationStatus, setDestinationStatus] = useState<string | null>(null);
  const [notionPages, setNotionPages] = useState<ImportPage[]>([]);
  const [selectedNotionPageIds, setSelectedNotionPageIds] = useState<string[]>(
    [],
  );
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionImporting, setNotionImporting] = useState(false);
  const [notionImportStatus, setNotionImportStatus] = useState<string | null>(
    null,
  );
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveImportStatus, setDriveImportStatus] = useState<string | null>(null);

  const pickerApiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY?.trim() ?? "";
  const pickerAppId = process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID?.trim() ?? "";
  const hasSelectedDestination = Boolean(destinationWorkspaceId && destinationFolderId);
  const hasSavedDestination = Boolean(destination?.folderId);
  const selectedPagesCount = selectedNotionPageIds.length;
  const googleImportBlockedReason = driveImporting
    ? "Google Drive import is in progress."
    : !googleStatus?.ready
      ? "Reconnect Google to continue."
      : !hasSelectedDestination
        ? "Choose a destination folder first."
        : !pickerApiKey
          ? "Set NEXT_PUBLIC_GOOGLE_PICKER_API_KEY and restart the web app."
          : null;

  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewStatus(null);

    try {
      const response = await fetch("/api/imports/providers", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load import settings.");
      }

      const payload = (await response.json()) as {
        destination: ImportDestination;
        providers: {
          google: ImportProviderStatus;
          notion: ImportProviderStatus;
        };
      };

      setDestination(payload.destination);
      setGoogleStatus(payload.providers.google);
      setNotionStatus(payload.providers.notion);
      setDestinationWorkspaceId(
        payload.destination?.workspaceId ?? workspaces[0]?.workspaceId ?? "",
      );
      setDestinationFolderId(payload.destination?.folderId ?? "");
      if (payload.providers.google.connected) {
        setDriveImportStatus(
          payload.providers.google.ready ? "Google account connected." : null,
        );
      }
      if (payload.providers.notion.connected) {
        setNotionImportStatus(
          payload.providers.notion.ready ? "Notion account connected." : null,
        );
      }
    } catch (error) {
      setOverviewStatus(
        error instanceof Error ? error.message : "Unable to load imports.",
      );
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (!destinationWorkspaceId) {
      setFolderOptions([]);
      return;
    }

    let cancelled = false;
    const loadFolders = async () => {
      setFolderLoading(true);

      try {
        const response = await fetch(
          `/api/imports/destination/folders?workspaceId=${encodeURIComponent(
            destinationWorkspaceId,
          )}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error("Unable to load folders.");
        }

        const payload = (await response.json()) as {
          folders: Array<{
            id: string;
            name: string;
            parentId: string | null;
            readOnly: boolean;
          }>;
          rootFolderId: string;
        };

        if (cancelled) {
          return;
        }

        const options = buildFolderOptions(payload.rootFolderId, payload.folders);
        setFolderOptions(options);
        if (!options.some((entry) => entry.id === destinationFolderId)) {
          const firstWritable = options.find((entry) => !entry.readOnly);
          setDestinationFolderId(firstWritable?.id ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setFolderOptions([]);
          setDestinationStatus(
            error instanceof Error ? error.message : "Unable to load folders.",
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

  const selectedFolder = useMemo(
    () => folderOptions.find((entry) => entry.id === destinationFolderId) ?? null,
    [destinationFolderId, folderOptions],
  );

  const toggleNotionPage = (pageId: string) => {
    setSelectedNotionPageIds((current) =>
      current.includes(pageId)
        ? current.filter((entry) => entry !== pageId)
        : [...current, pageId],
    );
  };

  const saveDestination = async () => {
    if (!(destinationWorkspaceId && destinationFolderId)) {
      setDestinationStatus("Choose a workspace and folder first.");
      return;
    }

    setDestinationStatus("Saving destination...");
    try {
      const response = await fetch("/api/imports/destination", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: destinationFolderId,
          workspaceId: destinationWorkspaceId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        destination?: ImportDestination;
        error?: string;
      };
      if (!response.ok || !payload.destination) {
        throw new Error(payload.error ?? "Unable to save destination.");
      }

      setDestination(payload.destination);
      setDestinationStatus("Import destination saved.");
    } catch (error) {
      setDestinationStatus(
        error instanceof Error ? error.message : "Unable to save destination.",
      );
    }
  };

  const ensureSavedDestination = async () => {
    if (!(destinationWorkspaceId && destinationFolderId)) {
      throw new Error("Choose and save an import destination first.");
    }

    if (
      destination?.workspaceId === destinationWorkspaceId &&
      destination?.folderId === destinationFolderId
    ) {
      return destination;
    }

    const response = await fetch("/api/imports/destination", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        folderId: destinationFolderId,
        workspaceId: destinationWorkspaceId,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      destination?: ImportDestination;
      error?: string;
    };
    if (!response.ok || !payload.destination) {
      throw new Error(payload.error ?? "Unable to save destination.");
    }

    setDestination(payload.destination);
    setDestinationStatus("Import destination saved.");
    return payload.destination;
  };

  const connectGoogleDrive = async () => {
    setDriveImportStatus("Redirecting to Google...");
    await linkSocial({
      callbackURL: getSettingsDataCallbackUrl(),
      provider: "google",
      scopes: GOOGLE_IMPORT_SCOPES,
    });
  };

  const connectNotion = async () => {
    setNotionImportStatus("Redirecting to Notion...");
    await linkSocial({
      callbackURL: getSettingsDataCallbackUrl(),
      provider: "notion",
    });
  };

  const loadNotionPages = async () => {
    setNotionLoading(true);
    setNotionImportStatus("Loading Notion pages...");
    try {
      const response = await fetch("/api/imports/notion/pages", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        pages?: ImportPage[];
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load Notion pages.");
      }

      setNotionPages(payload.pages ?? []);
      setSelectedNotionPageIds([]);
      setNotionImportStatus(
        payload.pages?.length
          ? "Choose pages to import."
          : "No importable Notion pages were found.",
      );
    } catch (error) {
      setNotionImportStatus(
        error instanceof Error ? error.message : "Unable to load Notion pages.",
      );
    } finally {
      setNotionLoading(false);
    }
  };

  const importSelectedNotionPages = async () => {
    if (selectedNotionPageIds.length === 0) {
      setNotionImportStatus("Select at least one Notion page.");
      return;
    }

    setNotionImporting(true);
    setNotionImportStatus("Importing selected Notion pages...");
    try {
      await ensureSavedDestination();
      const response = await fetch("/api/imports/notion/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageIds: selectedNotionPageIds,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        imported?: Array<{ fileId: string }>;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import Notion pages.");
      }

      setNotionImportStatus(
        `Imported ${payload.imported?.length ?? 0} Notion page${
          (payload.imported?.length ?? 0) === 1 ? "" : "s"
        }.`,
      );
      await loadOverview();
    } catch (error) {
      setNotionImportStatus(
        error instanceof Error ? error.message : "Unable to import pages.",
      );
    } finally {
      setNotionImporting(false);
    }
  };

  const openGooglePicker = async () => {
    if (!pickerApiKey) {
      setDriveImportStatus(
        "Missing NEXT_PUBLIC_GOOGLE_PICKER_API_KEY for Google Picker.",
      );
      return;
    }

    setDriveImporting(true);
    setDriveImportStatus("Loading Google Drive Picker...");
    try {
      await ensureSavedDestination();
      const tokenResponse = await fetch("/api/imports/google-drive/picker-token", {
        cache: "no-store",
      });
      const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as {
        accessToken?: string;
        error?: string;
      };
      if (!tokenResponse.ok || !tokenPayload.accessToken) {
        throw new Error(
          tokenPayload.error ?? "Unable to get a Google Drive access token.",
        );
      }

      await ensureGooglePickerLoaded();

      const googlePicker = window.google?.picker;
      if (!googlePicker) {
        throw new Error("Google Picker is unavailable.");
      }

      const pickerView = new googlePicker.DocsView(googlePicker.ViewId.DOCS);
      pickerView.setIncludeFolders(false);
      pickerView.setSelectFolderEnabled(false);
      pickerView.setMode(googlePicker.DocsViewMode.LIST);

      const picker = (new googlePicker.PickerBuilder() as {
        addView: (view: unknown) => any;
        enableFeature: (feature: unknown) => any;
        setAppId: (appId: string) => any;
        setCallback: (callback: (data: any) => void) => any;
        setDeveloperKey: (key: string) => any;
        setOAuthToken: (token: string) => any;
        build: () => { setVisible: (value: boolean) => void };
      })
        .addView(pickerView)
        .enableFeature(googlePicker.Feature.MULTISELECT_ENABLED)
        .setCallback((data: any) => {
          if (data[googlePicker.Response.ACTION] !== googlePicker.Action.PICKED) {
            setDriveImporting(false);
            setDriveImportStatus("Google Drive import cancelled.");
            return;
          }

          const documents = (data[googlePicker.Response.DOCUMENTS] ?? []) as Array<{
            id?: string;
          }>;
          const fileIds = documents
            .map((entry) => entry.id?.trim())
            .filter((entry): entry is string => Boolean(entry));

          void (async () => {
            setDriveImportStatus("Importing selected Drive files...");
            try {
              const response = await fetch("/api/imports/google-drive/import", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ fileIds }),
              });
              const payload = (await response.json().catch(() => ({}))) as {
                error?: string;
                imported?: Array<{ fileId: string }>;
              };
              if (!response.ok) {
                throw new Error(payload.error ?? "Unable to import Drive files.");
              }

              setDriveImportStatus(
                `Imported ${payload.imported?.length ?? 0} Drive file${
                  (payload.imported?.length ?? 0) === 1 ? "" : "s"
                }.`,
              );
              await loadOverview();
            } catch (error) {
              setDriveImportStatus(
                error instanceof Error
                  ? error.message
                  : "Unable to import Drive files.",
              );
            } finally {
              setDriveImporting(false);
            }
          })();
        })
        .setDeveloperKey(pickerApiKey)
        .setOAuthToken(tokenPayload.accessToken);

      if (pickerAppId) {
        picker.setAppId(pickerAppId);
      }

      picker.build().setVisible(true);
      setDriveImportStatus("Choose one or more files to import.");
    } catch (error) {
      setDriveImportStatus(
        error instanceof Error
          ? error.message
          : "Unable to open Google Drive Picker.",
      );
      setDriveImporting(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium text-sm">Data imports</p>
            <p className="text-muted-foreground text-xs">
              Link a source, choose a folder, import.
            </p>
          </div>
          <Button
            onClick={() => {
              void loadOverview();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {overviewLoading ? (
              <Spinner className="mr-2 size-3.5" />
            ) : (
              <Refresh className="mr-2 size-3.5" />
            )}
            Refresh
          </Button>
        </div>

        <Separator />

        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4" />
                    <p className="font-medium text-sm">Google Drive</p>
                  </div>
                  <p className="mt-1 truncate text-muted-foreground text-xs">
                    {driveImportStatus ?? getProviderSummary(googleStatus)}
                  </p>
                </div>
                <ProviderBadge
                  status={
                    googleStatus ?? {
                      accountId: null,
                      configured: false,
                    connected: false,
                    hasRefreshToken: false,
                    hasUsableAccessToken: false,
                    ready: false,
                    scopes: [],
                  }
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!googleStatus?.configured}
                  onClick={() => {
                    void connectGoogleDrive();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LinkIcon className="mr-2 size-3.5" />
                  {googleStatus?.connected ? "Reconnect" : "Connect"}
                </Button>
                <Button
                  disabled={
                    driveImporting ||
                    !googleStatus?.ready ||
                    !hasSelectedDestination
                  }
                  onClick={() => {
                    void openGooglePicker();
                  }}
                  size="sm"
                  type="button"
                >
                  {driveImporting ? (
                    <Spinner className="mr-2 size-3.5" />
                  ) : (
                    <Download className="mr-2 size-3.5" />
                  )}
                  Import from Drive
                </Button>
              </div>
              {!driveImportStatus && googleImportBlockedReason ? (
                <p className="mt-2 text-muted-foreground text-xs">
                  {googleImportBlockedReason}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="size-4" />
                    <p className="font-medium text-sm">Notion</p>
                  </div>
                  <p className="mt-1 truncate text-muted-foreground text-xs">
                    {notionImportStatus ?? getProviderSummary(notionStatus)}
                  </p>
                </div>
                <ProviderBadge
                  status={
                    notionStatus ?? {
                      accountId: null,
                      configured: false,
                    connected: false,
                    hasRefreshToken: false,
                    hasUsableAccessToken: false,
                    ready: false,
                    scopes: [],
                  }
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!notionStatus?.configured}
                  onClick={() => {
                    void connectNotion();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LinkIcon className="mr-2 size-3.5" />
                  {notionStatus?.connected ? "Reconnect" : "Connect"}
                </Button>
                <Button
                  disabled={notionLoading || !notionStatus?.ready}
                  onClick={() => {
                    void loadNotionPages();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {notionLoading ? (
                    <Spinner className="mr-2 size-3.5" />
                  ) : (
                    <Refresh className="mr-2 size-3.5" />
                  )}
                  Load pages
                </Button>
              </div>
            </div>
          </div>

          <div className="border-border/60 border-t px-4 py-4 lg:border-t-0 lg:border-l">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-sm">Destination</p>
              {destination ? (
                <Badge variant="outline">Saved</Badge>
              ) : null}
            </div>

            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs">Workspace</p>
                <Select
                  onValueChange={(value) => {
                    setDestinationWorkspaceId(value ?? "");
                    setDestinationStatus(null);
                  }}
                  value={destinationWorkspaceId}
                >
                  <SelectTrigger className="h-9 w-full border-border bg-background px-3 text-sm">
                    <SelectValue placeholder="Select workspace" />
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
                  onValueChange={(value) => {
                    setDestinationFolderId(value ?? "");
                    setDestinationStatus(null);
                  }}
                  value={destinationFolderId}
                >
                  <SelectTrigger className="h-9 w-full border-border bg-background px-3 text-sm">
                    <SelectValue placeholder="Select folder" />
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

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-muted-foreground text-xs">
                  {folderLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-3.5" />
                      Loading folders
                    </span>
                  ) : destination ? (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle className="size-3.5 text-emerald-600" />
                      <span className="truncate">
                        {destination.workspaceName} / {destination.folderName}
                      </span>
                    </span>
                  ) : hasSelectedDestination ? (
                    "Will save on import"
                  ) : (
                    "No folder selected"
                  )}
                </div>

                <Button
                  disabled={
                    folderLoading ||
                    !destinationWorkspaceId ||
                    !destinationFolderId ||
                    selectedFolder?.readOnly
                  }
                  onClick={() => {
                    void saveDestination();
                  }}
                  size="sm"
                  type="button"
                >
                  Save
                </Button>
              </div>

              {destinationStatus ? (
                <p className="text-muted-foreground text-xs">{destinationStatus}</p>
              ) : null}
            </div>
          </div>
        </div>

        {overviewStatus ? (
          <>
            <Separator />
            <div className="px-4 py-2 text-muted-foreground text-xs">
              {overviewStatus}
            </div>
          </>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-sm">Notion pages</p>
            <p className="text-muted-foreground text-xs">
              {notionPages.length === 0
                ? "No pages loaded"
                : `${selectedPagesCount} selected · ${notionPages.length} available`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={notionLoading || !notionStatus?.ready}
              onClick={() => {
                void loadNotionPages();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {notionLoading ? (
                <Spinner className="mr-2 size-3.5" />
              ) : (
                <Refresh className="mr-2 size-3.5" />
              )}
              Reload
            </Button>
            <Button
              disabled={
                notionImporting ||
                selectedPagesCount === 0 ||
                !hasSelectedDestination
              }
              onClick={() => {
                void importSelectedNotionPages();
              }}
              size="sm"
              type="button"
            >
              {notionImporting ? (
                <Spinner className="mr-2 size-3.5" />
              ) : (
                <Download className="mr-2 size-3.5" />
              )}
              Import selected
            </Button>
          </div>
        </div>

        <Separator />

        {notionPages.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">
            Load pages from Notion to start a selection.
          </div>
        ) : (
          <ScrollArea className="max-h-[24rem]">
            <div className="divide-y divide-border/60">
              {notionPages.map((page) => {
                const checked = selectedNotionPageIds.includes(page.id);
                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
                    key={page.id}
                  >
                    <Checkbox
                      checked={checked}
                      className="mt-0.5"
                      onCheckedChange={() => toggleNotionPage(page.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate font-medium text-sm">{page.title}</p>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {formatTimestamp(page.lastEditedTime)}
                        </span>
                      </div>
                      {page.url ? (
                        <a
                          className="mt-1 inline-flex text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
                          href={page.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open in Notion
                        </a>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>
    </div>
  );
}
