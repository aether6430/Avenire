"use client";

import type {
  FolderOption,
  ImportDestination,
  ImportPage,
  ImportProviderStatus,
} from "@/components/settings/data-imports-model";

interface DataImportsOverviewPayload {
  destination: ImportDestination;
  providers: {
    google: ImportProviderStatus;
    notion: ImportProviderStatus;
  };
}

interface DataImportFoldersPayload {
  folders: Pick<FolderOption, "id" | "name" | "parentId" | "readOnly">[];
  rootFolderId: string;
}

function getDataImportsError(
  payload: { error?: string } | null | undefined,
  fallback: string
) {
  return payload?.error ?? fallback;
}

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

export async function loadDataImportsOverview() {
  const response = await fetch("/api/imports/providers", {
    cache: "no-store",
  });
  const payload = await parseJson<
    DataImportsOverviewPayload & { error?: string }
  >(response);

  if (!response.ok) {
    throw new Error(
      getDataImportsError(payload, "Unable to load import settings.")
    );
  }

  return payload;
}

export async function loadDataImportFolders(workspaceId: string) {
  const response = await fetch(
    `/api/imports/destination/folders?workspaceId=${encodeURIComponent(
      workspaceId
    )}`,
    {
      cache: "no-store",
    }
  );
  const payload = await parseJson<
    DataImportFoldersPayload & { error?: string }
  >(response);

  if (!response.ok) {
    throw new Error(getDataImportsError(payload, "Unable to load folders."));
  }

  return payload;
}

export async function saveDataImportDestination({
  folderId,
  workspaceId,
}: {
  folderId: string;
  workspaceId: string;
}) {
  const response = await fetch("/api/imports/destination", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      folderId,
      workspaceId,
    }),
  });
  const payload = await parseJson<{
    destination?: ImportDestination;
    error?: string;
  }>(response);

  if (!(response.ok && payload.destination)) {
    throw new Error(
      getDataImportsError(payload, "Unable to save destination.")
    );
  }

  return payload.destination;
}

export async function loadNotionImportPages() {
  const response = await fetch("/api/imports/notion/pages", {
    cache: "no-store",
  });
  const payload = await parseJson<{
    error?: string;
    pages?: ImportPage[];
  }>(response);

  if (!response.ok) {
    throw new Error(
      getDataImportsError(payload, "Unable to load Notion pages.")
    );
  }

  return payload.pages ?? [];
}

export async function importNotionPages(pageIds: string[]) {
  const response = await fetch("/api/imports/notion/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pageIds,
    }),
  });
  const payload = await parseJson<{
    error?: string;
    imported?: Array<{ fileId: string }>;
  }>(response);

  if (!response.ok) {
    throw new Error(
      getDataImportsError(payload, "Unable to import Notion pages.")
    );
  }

  return payload.imported ?? [];
}

export async function loadGooglePickerToken() {
  const response = await fetch("/api/imports/google-drive/picker-token", {
    cache: "no-store",
  });
  const payload = await parseJson<{
    accessToken?: string;
    error?: string;
  }>(response);

  if (!(response.ok && payload.accessToken)) {
    throw new Error(
      getDataImportsError(payload, "Unable to get a Google Drive access token.")
    );
  }

  return payload.accessToken;
}

export async function importGoogleDriveFiles(fileIds: string[]) {
  const response = await fetch("/api/imports/google-drive/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileIds }),
  });
  const payload = await parseJson<{
    error?: string;
    imported?: Array<{ fileId: string }>;
  }>(response);

  if (!response.ok) {
    throw new Error(
      getDataImportsError(payload, "Unable to import Drive files.")
    );
  }

  return payload.imported ?? [];
}
