import { resolveApiErrorMessage } from "@/lib/api-error-message";

export interface UploadThingServerFile {
  contentType?: string;
  key: string;
  name: string;
  size: number;
  uploadedAt: number;
  url: string;
}

export const FILES_ROUTE_LOAD_ERROR = "Unable to load files.";

export function inferUploadThingServerFileContentType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();

  if (!extension) {
    return undefined;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return `image/${extension === "jpg" ? "jpeg" : extension}`;
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (["txt", "md"].includes(extension)) {
    return "text/plain";
  }

  return undefined;
}

export function mapWorkspaceFileToServerFile(file: {
  createdAt: string;
  mimeType: string | null;
  name: string;
  sizeBytes: number;
  storageKey: string;
}): UploadThingServerFile {
  return {
    key: file.storageKey,
    name: file.name,
    size: file.sizeBytes,
    uploadedAt: Date.parse(file.createdAt),
    url: "",
    contentType:
      file.mimeType ?? inferUploadThingServerFileContentType(file.name),
  };
}

export function hydrateUploadThingServerFiles(input: {
  files: UploadThingServerFile[];
  urls: ReadonlyArray<{ key?: unknown; url?: unknown }>;
}) {
  const urlByKey = new Map(
    input.urls
      .filter(
        (entry) =>
          typeof entry?.key === "string" && typeof entry?.url === "string"
      )
      .map((entry) => [entry.key as string, entry.url as string])
  );

  return input.files
    .map((file) => ({
      ...file,
      url: urlByKey.get(file.key) ?? "",
    }))
    .filter((file) => file.url.length > 0)
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export function resolveFilesRouteActiveOrganizationId(session: {
  session?: unknown;
}) {
  const sessionDetails = session.session;
  if (!sessionDetails || typeof sessionDetails !== "object") {
    return null;
  }

  const activeOrganizationId = (
    sessionDetails as { activeOrganizationId?: unknown }
  ).activeOrganizationId;
  return typeof activeOrganizationId === "string" ? activeOrganizationId : null;
}

export function resolveFilesRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}
