const MIME_TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  md: "text/markdown",
  mdx: "text/markdown",
  txt: "text/plain",
  url: "application/url",
  csv: "text/csv",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ott: "application/vnd.oasis.opendocument.text-template",
  odm: "application/vnd.oasis.opendocument.text-master",
  odp: "application/vnd.oasis.opendocument.presentation",
  otp: "application/vnd.oasis.opendocument.presentation-template",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  ots: "application/vnd.oasis.opendocument.spreadsheet-template",
  odg: "application/vnd.oasis.opendocument.graphics",
  otg: "application/vnd.oasis.opendocument.graphics-template",
  odf: "application/vnd.oasis.opendocument.formula",
  odb: "application/vnd.oasis.opendocument.database",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
} as const;

export type SupportedFileMimeType =
  (typeof MIME_TYPE_BY_EXTENSION)[keyof typeof MIME_TYPE_BY_EXTENSION];

const FILE_MIME_ENTRIES = Object.entries(MIME_TYPE_BY_EXTENSION);

export function normalizeFileMimeType(
  value: string | null | undefined
): SupportedFileMimeType | null {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!normalized || normalized.includes("*")) {
    return null;
  }
  const canonical = normalized === "image/jpg" ? "image/jpeg" : normalized;
  return FILE_MIME_ENTRIES.find((entry) => entry[1] === canonical)?.[1] ?? null;
}

export function inferFileMimeTypeFromName(
  name: string
): SupportedFileMimeType | null {
  const normalized = name.trim().toLowerCase();
  const extension = normalized.match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension) {
    return null;
  }
  return FILE_MIME_ENTRIES.find((entry) => entry[0] === extension)?.[1] ?? null;
}

export function resolveFileMimeType(input: {
  declaredMimeType?: string | null;
  name: string;
}): SupportedFileMimeType | null {
  const inferred = inferFileMimeTypeFromName(input.name);
  const raw =
    input.declaredMimeType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (
    raw &&
    raw !== "application/octet-stream" &&
    raw !== "unknown" &&
    !normalizeFileMimeType(raw)
  ) {
    return null;
  }
  const declared = normalizeFileMimeType(input.declaredMimeType);
  if (declared && inferred && declared !== inferred) {
    return null;
  }
  return declared ?? inferred;
}

export function isFileMimeTypeConsistent(input: {
  declaredMimeType?: string | null;
  name: string;
}) {
  const raw =
    input.declaredMimeType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (raw && raw !== "application/octet-stream" && raw !== "unknown") {
    const declared = normalizeFileMimeType(raw);
    const inferred = inferFileMimeTypeFromName(input.name);
    return Boolean(declared && inferred && declared === inferred);
  }
  return inferFileMimeTypeFromName(input.name) !== null;
}
