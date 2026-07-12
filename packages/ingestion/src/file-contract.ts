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

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

/** Detects concrete file types from a bounded prefix. Returns null when the
 * format has no reliable binary signature or the prefix is malformed. */
export function detectFileMimeTypeFromMagicBytes(
  bytes: Uint8Array
): SupportedFileMimeType | null {
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "application/pdf";
  }
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    return "image/gif";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") {
    return "audio/wav";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "AVI ") {
    return "video/x-msvideo";
  }
  if (ascii(bytes, 0, 4) === "OggS") {
    return "audio/ogg";
  }
  if (ascii(bytes, 0, 4) === "fLaC") {
    return "audio/flac";
  }
  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] ?? 0) >= 0xe0)) {
    return "audio/mpeg";
  }
  if (startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    return null; // WebM and Matroska share EBML; extension resolves the subtype.
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand.startsWith("hei") || brand.startsWith("hev")) return "image/heic";
    if (brand === "qt  ") return "video/quicktime";
    if (brand === "m4a ") return "audio/mp4";
    return "video/mp4";
  }
  if (startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return null; // OOXML and OpenDocument are ZIP containers.
  }
  if (startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return null; // Legacy Office formats share the OLE compound signature.
  }
  return null;
}

const ZIP_CONTAINER_MIME_TYPES = new Set<SupportedFileMimeType>([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.text-template",
  "application/vnd.oasis.opendocument.text-master",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.presentation-template",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet-template",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.graphics-template",
  "application/vnd.oasis.opendocument.formula",
  "application/vnd.oasis.opendocument.database",
]);

const OLE_CONTAINER_MIME_TYPES = new Set<SupportedFileMimeType>([
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

const TEXT_MIME_TYPES = new Set<SupportedFileMimeType>([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/url",
  "application/rtf",
  "image/svg+xml",
]);

export function fileMagicBytesMatchMimeType(input: {
  bytes: Uint8Array;
  mimeType: SupportedFileMimeType;
}) {
  const detected = detectFileMimeTypeFromMagicBytes(input.bytes);
  if (detected) return detected === input.mimeType;
  if (ZIP_CONTAINER_MIME_TYPES.has(input.mimeType)) {
    return startsWithBytes(input.bytes, [0x50, 0x4b, 0x03, 0x04]);
  }
  if (OLE_CONTAINER_MIME_TYPES.has(input.mimeType)) {
    return startsWithBytes(input.bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if (input.mimeType === "video/webm" || input.mimeType === "video/x-matroska") {
    return startsWithBytes(input.bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  if (input.mimeType === "video/x-m4v") {
    return ascii(input.bytes, 4, 4) === "ftyp";
  }
  if (input.mimeType === "audio/aac") {
    return input.bytes[0] === 0xff && ((input.bytes[1] ?? 0) & 0xf6) === 0xf0;
  }
  if (TEXT_MIME_TYPES.has(input.mimeType)) {
    if (input.bytes.includes(0)) return false;
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true })
        .decode(input.bytes)
        .trimStart();
    } catch {
      return false;
    }
    if (input.mimeType === "application/rtf") return text.startsWith("{\\rtf");
    if (input.mimeType === "image/svg+xml") return /^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text);
    return true;
  }
  return false;
}
