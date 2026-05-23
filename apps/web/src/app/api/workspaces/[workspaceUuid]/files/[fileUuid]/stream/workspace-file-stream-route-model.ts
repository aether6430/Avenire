export const WORKSPACE_FILE_STREAM_CHUNK_BYTES = 4 * 1024 * 1024;
export const WORKSPACE_FILE_STREAM_ERROR = "Unable to stream file";

export function normalizeWorkspaceFileStreamSingleRange(input: {
  rangeHeader: string;
  sizeBytes: number;
}) {
  const { rangeHeader, sizeBytes } = input;
  if (!rangeHeader.startsWith("bytes=")) {
    return null;
  }

  const value = rangeHeader.slice("bytes=".length).trim();
  if (!value || value.includes(",")) {
    return null;
  }

  const [startRaw, endRaw] = value.split("-", 2);
  const parsedStart = Number.parseInt(startRaw ?? "", 10);
  const parsedEnd =
    typeof endRaw === "string" && endRaw.trim().length > 0
      ? Number.parseInt(endRaw, 10)
      : Number.NaN;

  if (
    !Number.isFinite(parsedStart) ||
    parsedStart < 0 ||
    parsedStart >= sizeBytes
  ) {
    return null;
  }

  const naturalEnd =
    Number.isFinite(parsedEnd) && parsedEnd >= parsedStart
      ? Math.min(sizeBytes - 1, parsedEnd)
      : sizeBytes - 1;
  const cappedEnd = Math.min(
    naturalEnd,
    parsedStart + WORKSPACE_FILE_STREAM_CHUNK_BYTES - 1
  );

  return `bytes=${parsedStart}-${cappedEnd}`;
}

export function isWorkspaceFileStreamableMediaMimeType(
  mimeType: string | null | undefined
) {
  const normalized = (mimeType ?? "").toLowerCase();
  return normalized.startsWith("video/") || normalized.startsWith("audio/");
}

export function resolveWorkspaceFileStreamForwardedRange(input: {
  requestedRange: string | null;
  mimeType: string | null | undefined;
  sizeBytes: number | null | undefined;
}) {
  const requestedRange = input.requestedRange?.trim() || null;
  const startupRange =
    !requestedRange &&
    isWorkspaceFileStreamableMediaMimeType(input.mimeType ?? null)
      ? "bytes=0-4194303"
      : null;
  const normalizedRequestedRange =
    requestedRange &&
    Number.isFinite(input.sizeBytes) &&
    (input.sizeBytes ?? 0) > 0
      ? normalizeWorkspaceFileStreamSingleRange({
          rangeHeader: requestedRange,
          sizeBytes: input.sizeBytes as number,
        })
      : null;

  return normalizedRequestedRange ?? requestedRange ?? startupRange;
}

export function buildWorkspaceFileStreamResponseHeaders(input: {
  requestedRange: string | null;
  upstreamHeaders: Headers;
  upstreamStatus: number;
}) {
  const headers = new Headers();
  const passthrough = [
    "accept-ranges",
    "content-disposition",
    "etag",
    "content-length",
    "content-range",
    "content-type",
    "last-modified",
  ];

  for (const key of passthrough) {
    const value = input.upstreamHeaders.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  if (!headers.get("accept-ranges")) {
    headers.set("accept-ranges", "bytes");
  }
  if (input.requestedRange && input.upstreamStatus === 200) {
    headers.set("x-avenire-range-supported", "false");
  }
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("vary", "Range, Cookie");

  return headers;
}

export function resolveWorkspaceFileStreamRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
