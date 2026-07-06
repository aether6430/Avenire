import { config } from "../config";
import { PostgresVectorStore } from "../retrieval/postgres-vector-store";
import { assertSafeUrl, safeRemoteFetch } from "../utils/safety";
import { ingestAudio } from "./audio";
import { ingestImage } from "./image";
import { ingestLink } from "./link";
import { ingestMarkdown } from "./markdown";
import { ingestPdfs } from "./ocr";
import { ingestOfficeDocument } from "./office";
import { persistCanonicalResource } from "./persist";
import type { CanonicalResource, IngestResponse } from "./types";
import { ingestVideo } from "./video";

const logCorpusGrowth = async (
  before: Awaited<ReturnType<PostgresVectorStore["corpusStats"]>>,
  vectorStore: PostgresVectorStore
): Promise<void> => {
  const after = await vectorStore.corpusStats();
  console.log(
    JSON.stringify({
      event: "ingestion.corpus_growth",
      before,
      after,
      delta: {
        resources: after.resources - before.resources,
        chunks: after.chunks - before.chunks,
        embeddings: after.embeddings - before.embeddings,
      },
    })
  );
};

const toTranscriptCues = (
  resource: CanonicalResource
): Array<{ startMs: number; endMs: number; text: string }> => {
  if (resource.sourceType !== "video") {
    return [];
  }

  return resource.chunks
    .filter(
      (chunk) =>
        (chunk.metadata.extra as Record<string, unknown> | undefined)
          ?.section === "video-transcript" &&
        typeof chunk.metadata.startMs === "number" &&
        typeof chunk.metadata.endMs === "number"
    )
    .map((chunk) => ({
      startMs: Math.max(0, chunk.metadata.startMs ?? 0),
      endMs: Math.max(chunk.metadata.startMs ?? 0, chunk.metadata.endMs ?? 0),
      text: chunk.content.replace(/\s+/g, " ").trim(),
    }))
    .filter((cue) => cue.text.length > 0)
    .slice(0, 5000);
};

const persistResources = async (input: {
  workspaceId: string;
  fileId: string | null;
  resources: CanonicalResource[];
}) => {
  const persisted: IngestResponse["resources"] = [];
  let transcriptCues: Array<{ startMs: number; endMs: number; text: string }> =
    [];

  for (const resource of input.resources) {
    const record = await persistCanonicalResource(
      input.workspaceId,
      input.fileId,
      resource
    );
    persisted.push({
      resourceId: record.resourceId,
      sourceType: resource.sourceType,
      source: resource.source,
      provider: resource.provider,
      chunks: record.chunks,
    });

    if (resource.sourceType === "video") {
      transcriptCues = toTranscriptCues(resource);
    }
  }

  return { resources: persisted, transcriptCues };
};

const logStageTiming = (params: {
  stage: string;
  durationMs: number;
  workspaceId: string;
  fileId: string;
  mimeType?: string | null;
}) => {
  if (!config.ingestionStageTimingLog) {
    return;
  }

  console.log(
    JSON.stringify({
      event: "ingestion.stage_timing",
      ...params,
    })
  );
};

const sleep = async (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const shouldRetryStatus = (status: number) =>
  status === 408 || status === 425 || status === 429 || status >= 500;

const inferMimeTypeFromName = (fileName: string): string | null => {
  const normalizedName = fileName.trim().toLowerCase();
  if (!normalizedName.includes(".")) {
    return null;
  }

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (normalizedName.endsWith(".md")) {
    return "text/markdown";
  }
  if (normalizedName.endsWith(".txt")) {
    return "text/plain";
  }
  if (normalizedName.endsWith(".url")) {
    return "application/url";
  }
  if (normalizedName.endsWith(".doc")) {
    return "application/msword";
  }
  if (normalizedName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalizedName.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }
  if (normalizedName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (normalizedName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  if (normalizedName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (normalizedName.endsWith(".csv")) {
    return "text/csv";
  }
  if (normalizedName.endsWith(".odt")) {
    return "application/vnd.oasis.opendocument.text";
  }
  if (normalizedName.endsWith(".ott")) {
    return "application/vnd.oasis.opendocument.text-template";
  }
  if (normalizedName.endsWith(".odm")) {
    return "application/vnd.oasis.opendocument.text-master";
  }
  if (normalizedName.endsWith(".odp")) {
    return "application/vnd.oasis.opendocument.presentation";
  }
  if (normalizedName.endsWith(".otp")) {
    return "application/vnd.oasis.opendocument.presentation-template";
  }
  if (normalizedName.endsWith(".ods")) {
    return "application/vnd.oasis.opendocument.spreadsheet";
  }
  if (normalizedName.endsWith(".ots")) {
    return "application/vnd.oasis.opendocument.spreadsheet-template";
  }
  if (normalizedName.endsWith(".odb")) {
    return "application/vnd.oasis.opendocument.database";
  }
  if (normalizedName.endsWith(".odf")) {
    return "application/vnd.oasis.opendocument.formula";
  }
  if (normalizedName.endsWith(".odg")) {
    return "application/vnd.oasis.opendocument.graphics";
  }
  if (normalizedName.endsWith(".otg")) {
    return "application/vnd.oasis.opendocument.graphics-template";
  }
  if (normalizedName.endsWith(".rtf")) {
    return "application/rtf";
  }

  const imageExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".heic",
    ".heif",
    ".tif",
    ".tiff",
    ".avif",
  ];
  if (imageExtensions.some((extension) => normalizedName.endsWith(extension))) {
    return "image/*";
  }

  const videoExtensions = [
    ".mp4",
    ".mov",
    ".m4v",
    ".webm",
    ".avi",
    ".mkv",
    ".mpeg",
    ".mpg",
  ];
  if (videoExtensions.some((extension) => normalizedName.endsWith(extension))) {
    return "video/*";
  }

  const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
  if (audioExtensions.some((extension) => normalizedName.endsWith(extension))) {
    return "audio/*";
  }

  return null;
};

const safeDecodeUrlSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isOfficeDocumentType = (input: {
  fileName: string;
  mimeType: string;
}) => {
  const fileName = input.fileName.toLowerCase();
  const officeMimeTypes = new Set([
    "application/msword",
    "application/rtf",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/vnd.oasis.opendocument.database",
    "application/vnd.oasis.opendocument.formula",
    "application/vnd.oasis.opendocument.graphics",
    "application/vnd.oasis.opendocument.graphics-template",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.presentation-template",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.spreadsheet-template",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.text-master",
    "application/vnd.oasis.opendocument.text-template",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
  ]);
  const officeExtensions = [
    ".csv",
    ".doc",
    ".docx",
    ".odb",
    ".odf",
    ".odg",
    ".odm",
    ".odp",
    ".ods",
    ".odt",
    ".otg",
    ".otp",
    ".ots",
    ".ott",
    ".ppt",
    ".pptx",
    ".rtf",
    ".xls",
    ".xlsx",
  ];

  return (
    officeMimeTypes.has(input.mimeType) ||
    officeExtensions.some((extension) => fileName.endsWith(extension))
  );
};

const resolveEffectiveMimeType = (input: {
  fileName: string;
  mimeType?: string | null;
}) => {
  const normalizedMime = input.mimeType?.trim().toLowerCase() ?? "";
  if (
    normalizedMime &&
    normalizedMime !== "application/octet-stream" &&
    normalizedMime !== "unknown"
  ) {
    return normalizedMime;
  }

  return inferMimeTypeFromName(input.fileName) ?? normalizedMime;
};

const normalizeUploadThingStorageUrl = (
  storageUrl: string,
  storageKey?: string | null
) => {
  let parsed: URL;
  try {
    parsed = new URL(storageUrl);
  } catch {
    return storageUrl;
  }

  const host = parsed.hostname.toLowerCase();
  const isUploadThingHost = host === "utfs.io" || host.endsWith(".ufs.sh");
  if (!isUploadThingHost) {
    return storageUrl;
  }

  const keyFromPath = parsed.pathname.startsWith("/f/")
    ? decodeURIComponent(parsed.pathname.slice(3).split("/")[0] ?? "")
    : "";
  const key = (storageKey ?? keyFromPath).trim();
  if (!key) {
    return storageUrl;
  }

  return `https://utfs.io/f/${encodeURIComponent(key)}`;
};

const isTrustedStorageUrl = (url: URL) => {
  const host = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    (host === "utfs.io" || host.endsWith(".ufs.sh"))
  );
};

const resolveIngestionStorageUrl = (
  storageUrl: string,
  storageKey?: string | null
) => {
  const safeUrl = assertSafeUrl(
    normalizeUploadThingStorageUrl(storageUrl, storageKey)
  );
  if (!isTrustedStorageUrl(safeUrl)) {
    throw new Error(`Untrusted storage URL host: ${safeUrl.hostname}`);
  }
  return safeUrl.toString();
};

async function readTextResponseWithLimit(
  response: Awaited<ReturnType<typeof safeRemoteFetch>>,
  maxChars: number
): Promise<string> {
  const stream = response.body;
  if (!stream) {
    return await response.text();
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = "";

  try {
    while (content.length < maxChars) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      content += decoder.decode(value, { stream: true });
      if (content.length >= maxChars) {
        break;
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  content += decoder.decode();
  return content.slice(0, maxChars);
}

async function fetchRemoteText(url: string) {
  const attempts = Math.max(1, config.remoteFetchMaxAttempts);
  const timeoutMs = Math.max(1000, config.remoteFetchTimeoutMs);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await safeRemoteFetch(url, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(
          `Failed to fetch text source (${response.status}) from ${new URL(url).hostname}`
        );
        if (attempt < attempts && shouldRetryStatus(response.status)) {
          lastError = error;
          await sleep(Math.min(2500, 200 * 2 ** (attempt - 1)));
          continue;
        }
        Object.assign(error, { retryable: false });
        throw error;
      }

      return await readTextResponseWithLimit(response, config.maxMarkdownChars);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      const wrapped = new Error(
        `Failed to fetch text source from ${new URL(url).hostname}: ${message}`
      );
      if (error instanceof Error && error.name === "AbortError") {
        wrapped.name = "AbortError";
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "retryable" in error &&
        (error as { retryable?: boolean }).retryable === false
      ) {
        Object.assign(wrapped, { retryable: false });
      }
      lastError = wrapped;
      const retryable = !(
        typeof wrapped === "object" &&
        wrapped !== null &&
        "retryable" in wrapped &&
        (wrapped as { retryable?: boolean }).retryable === false
      );
      if (attempt < attempts && retryable) {
        await sleep(Math.min(2500, 200 * 2 ** (attempt - 1)));
        continue;
      }
      throw wrapped;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ??
    new Error(`Failed to fetch text source from ${new URL(url).hostname}`)
  );
}

export const ingestStoredFile = async (input: {
  workspaceId: string;
  fileId: string;
  sourceType?: string | null;
  storageUrl: string;
  storageKey?: string | null;
  fileName: string;
  mimeType?: string | null;
  metadata?: Record<string, unknown>;
  content?: string | null;
}) => {
  const vectorStore = new PostgresVectorStore(input.workspaceId);
  const beforeStats = await vectorStore.corpusStats();
  const mime = resolveEffectiveMimeType({
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
  const resolvedStorageUrl = resolveIngestionStorageUrl(
    input.storageUrl,
    input.storageKey
  );
  const extractionStartedAt = Date.now();
  const metadata = input.metadata ?? {};
  const linkMetadata =
    metadata.link &&
    typeof metadata.link === "object" &&
    !Array.isArray(metadata.link)
      ? (metadata.link as Record<string, unknown>)
      : null;
  const metadataType =
    typeof metadata.type === "string" ? metadata.type.trim().toLowerCase() : "";
  const metadataResourceType =
    typeof metadata.resourceType === "string"
      ? metadata.resourceType.trim().toLowerCase()
      : "";
  const explicitSourceType =
    typeof input.sourceType === "string"
      ? input.sourceType.trim().toLowerCase()
      : "";
  const linkSourceUrl =
    typeof linkMetadata?.sourceUrl === "string" &&
    linkMetadata.sourceUrl.trim().length > 0
      ? assertSafeUrl(linkMetadata.sourceUrl.trim()).toString()
      : null;
  const shouldIngestAsLink =
    explicitSourceType === "link" ||
    ((metadataType === "link-resource" ||
      metadataType === "link-note" ||
      metadataResourceType === "link-resource") &&
      Boolean(linkSourceUrl));
  const linkSourceFileName = linkSourceUrl
    ? safeDecodeUrlSegment(
        new URL(linkSourceUrl).pathname.split("/").filter(Boolean).at(-1) ??
          input.fileName
      )
    : input.fileName;

  let resources: CanonicalResource[] = [];
  if (shouldIngestAsLink && linkSourceUrl) {
    resources = isOfficeDocumentType({
      fileName: linkSourceFileName,
      mimeType: inferMimeTypeFromName(linkSourceFileName) ?? "",
    })
      ? [
          await ingestOfficeDocument({
            source: linkSourceUrl,
            title: input.fileName,
            url: linkSourceUrl,
          }),
        ]
      : [await ingestLink(linkSourceUrl)];
  } else if (typeof input.content === "string") {
    resources = [
      ingestMarkdown({
        markdown: input.content.slice(0, config.maxMarkdownChars),
        source: `note:${input.fileId}`,
        title: input.fileName,
      }),
    ];
  } else if (
    mime === "application/pdf" ||
    input.fileName.toLowerCase().endsWith(".pdf")
  ) {
    resources = await ingestPdfs([resolvedStorageUrl]);
  } else if (
    isOfficeDocumentType({
      fileName: input.fileName,
      mimeType: mime,
    })
  ) {
    resources = [
      await ingestOfficeDocument({
        source: resolvedStorageUrl,
        title: input.fileName,
        url: resolvedStorageUrl,
      }),
    ];
  } else if (mime.startsWith("image/")) {
    resources = [
      await ingestImage({
        url: resolvedStorageUrl,
        title: input.fileName,
      }),
    ];
  } else if (mime.startsWith("video/")) {
    resources = [
      await ingestVideo({
        url: resolvedStorageUrl,
        title: input.fileName,
      }),
    ];
  } else if (
    mime.startsWith("audio/") ||
    input.fileName.toLowerCase().endsWith(".mp3") ||
    input.fileName.toLowerCase().endsWith(".wav") ||
    input.fileName.toLowerCase().endsWith(".m4a") ||
    input.fileName.toLowerCase().endsWith(".aac") ||
    input.fileName.toLowerCase().endsWith(".ogg") ||
    input.fileName.toLowerCase().endsWith(".flac")
  ) {
    resources = [
      await ingestAudio({
        url: resolvedStorageUrl,
        title: input.fileName,
      }),
    ];
  } else if (
    mime.startsWith("text/") ||
    input.fileName.toLowerCase().endsWith(".md") ||
    input.fileName.toLowerCase().endsWith(".txt")
  ) {
    const markdown = await fetchRemoteText(resolvedStorageUrl);
    resources = [
      ingestMarkdown({
        markdown: markdown.slice(0, config.maxMarkdownChars),
        source: resolvedStorageUrl,
        title: input.fileName,
      }),
    ];
  } else if (mime === "application/url" || mime === "text/uri-list") {
    resources = [await ingestLink(resolvedStorageUrl)];
  } else {
    throw new Error(
      `Unsupported file type for ingestion: ${mime || "unknown"}`
    );
  }
  logStageTiming({
    stage: "extract",
    durationMs: Date.now() - extractionStartedAt,
    workspaceId: input.workspaceId,
    fileId: input.fileId,
    mimeType: mime || input.mimeType,
  });

  const persistStartedAt = Date.now();
  const persisted = await persistResources({
    workspaceId: input.workspaceId,
    fileId: input.fileId,
    resources,
  });
  logStageTiming({
    stage: "persist",
    durationMs: Date.now() - persistStartedAt,
    workspaceId: input.workspaceId,
    fileId: input.fileId,
    mimeType: mime || input.mimeType,
  });

  await logCorpusGrowth(beforeStats, vectorStore);
  return persisted;
};
