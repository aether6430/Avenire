type DurableStreamHeaders = Record<string, string>;

const CHAT_STREAM_PATH_PREFIX = "chat";
const DURABLE_STREAMS_URL_PATTERN = /^https?:\/\//i;

export interface ChatStreamPathParts {
  chatSlug: string;
  streamId: string;
  workspaceId: string;
}

export interface ParsedChatStreamPath extends ChatStreamPathParts {
  path: string;
}

function readRequiredDurableStreamUrl(primaryName: string) {
  const primaryValue = process.env[primaryName]?.trim();
  const fallbackValue = process.env.DURABLE_STREAMS_URL?.trim();
  const value = primaryValue || fallbackValue;
  if (!value) {
    throw new Error(
      `${primaryName} or DURABLE_STREAMS_URL is required for durable chat streams.`
    );
  }
  if (!DURABLE_STREAMS_URL_PATTERN.test(value)) {
    throw new Error(`${primaryName} must be an absolute http(s) URL.`);
  }
  return value.endsWith("/") ? value : `${value}/`;
}

function readOptionalBearerHeader(
  name: string
): DurableStreamHeaders | undefined {
  const token = process.env[name]?.trim();
  if (!token) {
    return undefined;
  }
  return { Authorization: `Bearer ${token}` };
}

function encodePathSegment(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Durable chat stream path segments cannot be empty.");
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error(`Durable chat stream path segment cannot be "${trimmed}".`);
  }
  return encodeURIComponent(trimmed);
}

function normalizeStreamPath(value: string) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.includes("://") ||
    trimmed.includes("..") ||
    trimmed === "." ||
    trimmed.includes("\\") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    return null;
  }
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

function decodePathSegment(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
}

export function buildChatStreamPath(parts: ChatStreamPathParts) {
  return [
    CHAT_STREAM_PATH_PREFIX,
    encodePathSegment(parts.workspaceId),
    encodePathSegment(parts.chatSlug),
    encodePathSegment(parts.streamId),
  ].join("/");
}

export function parseChatStreamPath(value: string | null) {
  const path = value ? normalizeStreamPath(value) : null;
  if (!path) {
    return null;
  }

  const [prefix, workspaceId, chatSlug, streamId, ...extra] = path.split("/");
  if (
    prefix !== CHAT_STREAM_PATH_PREFIX ||
    !workspaceId ||
    !chatSlug ||
    !streamId ||
    extra.length > 0
  ) {
    return null;
  }

  const decodedWorkspaceId = decodePathSegment(workspaceId);
  const decodedChatSlug = decodePathSegment(chatSlug);
  const decodedStreamId = decodePathSegment(streamId);
  if (!(decodedWorkspaceId && decodedChatSlug && decodedStreamId)) {
    return null;
  }

  return {
    chatSlug: decodedChatSlug,
    path,
    streamId: decodedStreamId,
    workspaceId: decodedWorkspaceId,
  } satisfies ParsedChatStreamPath;
}

export function buildDurableChatStreamWriteUrl(path: string) {
  return new URL(
    path,
    readRequiredDurableStreamUrl("DURABLE_STREAMS_WRITE_URL")
  ).toString();
}

export function buildDurableChatStreamReadUrl(path: string) {
  return new URL(
    path,
    readRequiredDurableStreamUrl("DURABLE_STREAMS_READ_URL")
  ).toString();
}

export function buildDurableChatStreamReadProxyUrl(
  request: Request,
  path: string
) {
  const url = new URL("/api/chat-stream", request.url);
  url.searchParams.set("path", path);
  return url.toString();
}

export function getDurableChatStreamWriteHeaders() {
  return readOptionalBearerHeader("DURABLE_STREAMS_WRITE_BEARER_TOKEN");
}

export function getDurableChatStreamReadHeaders() {
  return (
    readOptionalBearerHeader("DURABLE_STREAMS_READ_BEARER_TOKEN") ??
    readOptionalBearerHeader("DURABLE_STREAMS_WRITE_BEARER_TOKEN")
  );
}

export async function* readStreamAsAsyncIterable<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return;
      }
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}
