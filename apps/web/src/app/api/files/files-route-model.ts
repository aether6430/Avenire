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

  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "doc") {
    return "application/msword";
  }
  if (extension === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (extension === "ppt") {
    return "application/vnd.ms-powerpoint";
  }
  if (extension === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (extension === "xls") {
    return "application/vnd.ms-excel";
  }
  if (extension === "csv") {
    return "text/csv";
  }
  if (extension === "odt") {
    return "application/vnd.oasis.opendocument.text";
  }
  if (extension === "ott") {
    return "application/vnd.oasis.opendocument.text-template";
  }
  if (extension === "odm") {
    return "application/vnd.oasis.opendocument.text-master";
  }
  if (extension === "odp") {
    return "application/vnd.oasis.opendocument.presentation";
  }
  if (extension === "otp") {
    return "application/vnd.oasis.opendocument.presentation-template";
  }
  if (extension === "ods") {
    return "application/vnd.oasis.opendocument.spreadsheet";
  }
  if (extension === "ots") {
    return "application/vnd.oasis.opendocument.spreadsheet-template";
  }
  if (extension === "odg") {
    return "application/vnd.oasis.opendocument.graphics";
  }
  if (extension === "otg") {
    return "application/vnd.oasis.opendocument.graphics-template";
  }
  if (extension === "odf") {
    return "application/vnd.oasis.opendocument.formula";
  }
  if (extension === "odb") {
    return "application/vnd.oasis.opendocument.database";
  }
  if (extension === "rtf") {
    return "application/rtf";
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
