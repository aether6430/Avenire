import { Mistral } from "@mistralai/mistralai";
import { config } from "../config";
import { mapWithConcurrency } from "../utils/concurrency";
import { assertMaxSize, assertSafeUrl, safeRemoteFetch } from "../utils/safety";
import { semanticChunkText } from "./chunking";
import type { CanonicalResource } from "./types";

interface OcrPage {
  images?: Array<{ id: string; imageAnnotation?: string | null }>;
  index: number;
  markdown: string;
  tables?: Array<{ id: string; content: string }>;
}

interface OcrResponse {
  model?: string;
  pages: OcrPage[];
}

interface NativePdfPage {
  page: number;
  text: string;
}

type OcrDocument =
  | { type: "document_url"; documentUrl: string }
  | { type: "file"; fileId: string };

const client = new Mistral({ apiKey: config.mistralApiKey });

const withTablesAndImages = (page: OcrPage): string => {
  const tableById = new Map((page.tables ?? []).map((t) => [t.id, t.content]));
  const imageById = new Map(
    (page.images ?? []).map((i) => [i.id, i.imageAnnotation ?? ""])
  );

  const withTables = page.markdown.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (full, label, href) => {
      const normalizedHref = decodeURIComponent(String(href))
        .replace(/^\.?\//, "")
        .replace(/\.html$/i, "");
      return (
        tableById.get(String(label)) ?? tableById.get(normalizedHref) ?? full
      );
    }
  );

  return withTables.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_full, alt, href) => {
    const key = String(alt || href || "").replace(/^\.?\//, "");
    const annotation = imageById.get(key);
    return annotation ? `[Figure] ${annotation}` : "";
  });
};

const normalizePdfPageText = (text: string): string => {
  const lines = text
    .replace(/\r/g, "\n")
    .replace(/[−–—]/g, "-")
    .replace(/-\n(?=[a-z])/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const out: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (out.at(-1) !== "") {
        out.push("");
      }
      continue;
    }

    const looksStructural =
      /^#{1,6}\s/.test(line) ||
      /^(\*|-|\d+\.)\s+/.test(line) ||
      /^\$.*\$$/.test(line) ||
      /^(figure|table|chapter|section)\b/i.test(line);

    if (looksStructural) {
      out.push(line);
      continue;
    }

    const prev = out.at(-1);
    if (prev && prev !== "") {
      out[out.length - 1] = `${prev} ${line}`;
    } else {
      out.push(line);
    }
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const normalizeNativePdfPageText = (text: string): string =>
  normalizePdfPageText(text)
    .replace(/([A-Za-z])\s+\(\s*([A-Za-z0-9])\s*\)/g, "$1($2)")
    .replace(/\s+([,.;:!?])/g, "$1");

const isNativePdfExtractionUsable = (pages: NativePdfPage[]): boolean => {
  if (pages.length === 0 || pages.length > config.pdfFastPathMaxPages) {
    return false;
  }

  return (
    pages.reduce((total, page) => total + page.text.length, 0) >=
    config.pdfFastPathMinChars
  );
};

const canonicalResourceFromNativePdfPages = (input: {
  pages: NativePdfPage[];
  source: string;
}): CanonicalResource => {
  const rawChunks = input.pages.flatMap((page) =>
    semanticChunkText({
      text: normalizeNativePdfPageText(page.text),
      sourceType: "pdf",
      source: input.source,
      page: page.page,
      baseMetadata: { extraction: "pdfjs-native" },
    })
  );

  return {
    sourceType: "pdf",
    source: input.source,
    metadata: {
      extraction: "pdfjs-native",
      pages: input.pages.length,
    },
    chunks: mergeShortChunks(rawChunks),
  };
};

const extractNativePdfResource = async (
  source: string
): Promise<CanonicalResource | null> => {
  if (!config.pdfFastPathEnabled) {
    return null;
  }

  try {
    const response = await safeRemoteFetch(source, {
      timeoutMs: config.pdfFetchTimeoutMs,
    });
    if (!response.ok) {
      return null;
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = import.meta.resolve(
        "pdfjs-dist/legacy/build/pdf.worker.mjs"
      );
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      assertMaxSize(
        "remote PDF payload",
        Number(contentLength),
        config.remotePdfMaxBytes
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    assertMaxSize(
      "remote PDF payload",
      bytes.byteLength,
      config.remotePdfMaxBytes
    );
    const document = await pdfjs.getDocument({ data: bytes }).promise;

    try {
      if (document.numPages > config.pdfFastPathMaxPages) {
        return null;
      }

      const pages: NativePdfPage[] = [];
      for (
        let pageNumber = 1;
        pageNumber <= document.numPages;
        pageNumber += 1
      ) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        pages.push({
          page: pageNumber,
          text: textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        });
      }

      return isNativePdfExtractionUsable(pages)
        ? canonicalResourceFromNativePdfPages({ pages, source })
        : null;
    } finally {
      await document.destroy();
    }
  } catch {
    // Scans and malformed PDFs remain on the OCR path.
    return null;
  }
};

const mergeShortChunks = (
  chunks: CanonicalResource["chunks"]
): CanonicalResource["chunks"] => {
  const minChars = 140;
  const merged: CanonicalResource["chunks"] = [];

  for (const chunk of chunks) {
    const prev = merged.at(-1);
    if (
      prev &&
      prev.metadata.page === chunk.metadata.page &&
      (prev.content.length < minChars || chunk.content.length < minChars)
    ) {
      prev.content = `${prev.content}\n${chunk.content}`.trim();
      continue;
    }
    merged.push({ ...chunk });
  }

  merged.forEach((chunk, index) => {
    chunk.chunkIndex = index;
  });

  return merged;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getRetryableOcrStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return status;
  }

  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\bstatus\s+(\d{3})\b/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const isRetryableOcrError = (error: unknown): boolean => {
  const status = getRetryableOcrStatus(error);
  if (status !== null) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("service unavailable") ||
    message.includes("internal_server_error") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
};

const withOcrRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  const attempts = Math.max(1, config.remoteFetchMaxAttempts);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableOcrError(error)) {
        throw error;
      }

      await sleep(Math.min(4000, 400 * 2 ** (attempt - 1)));
    }
  }

  throw lastError;
};

const ocrSingleDocument = async (
  document: OcrDocument,
  includeImageBase64 = false
): Promise<OcrResponse> => {
  const ocr = await withOcrRetry(() =>
    client.ocr.process({
      model: config.mistralOcrModel,
      document,
      tableFormat: "html",
      includeImageBase64,
      extractHeader: false,
      extractFooter: false,
    })
  );

  return {
    model: ocr.model,
    pages: ocr.pages,
  };
};

const streamToText = async (
  stream: ReadableStream<Uint8Array>
): Promise<string> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  const merged = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return merged.toString("utf-8");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> | null => {
  const nested = value[key];
  return isRecord(nested) ? nested : null;
};

const getString = (
  value: Record<string, unknown>,
  key: string
): string | null => {
  const nested = value[key];
  return typeof nested === "string" ? nested : null;
};

const toCustomId = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const getBatchCustomId = (row: Record<string, unknown>): string | null => {
  const request = getRecord(row, "request");
  return (
    toCustomId(row.custom_id) ??
    toCustomId(row.customId) ??
    (request ? toCustomId(request.custom_id) : null) ??
    (request ? toCustomId(request.customId) : null) ??
    toCustomId(row.id)
  );
};

const getBatchBody = (
  row: Record<string, unknown>
): Record<string, unknown> | null => {
  const response = getRecord(row, "response");
  return (
    (response ? getRecord(response, "body") : null) ??
    getRecord(row, "body") ??
    getRecord(row, "output") ??
    getRecord(row, "result")
  );
};

const parseOcrImages = (
  value: unknown
): OcrPage["images"] | undefined | null => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const images: NonNullable<OcrPage["images"]> = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const id = getString(item, "id");
    if (!id) {
      return null;
    }

    const imageAnnotation = item.imageAnnotation;
    if (
      imageAnnotation !== undefined &&
      imageAnnotation !== null &&
      typeof imageAnnotation !== "string"
    ) {
      return null;
    }

    images.push({ id, imageAnnotation });
  }

  return images;
};

const parseOcrTables = (
  value: unknown
): OcrPage["tables"] | undefined | null => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const tables: NonNullable<OcrPage["tables"]> = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const id = getString(item, "id");
    const content = getString(item, "content");
    if (!id || content === null) {
      return null;
    }

    tables.push({ id, content });
  }

  return tables;
};

const parseOcrPage = (value: unknown): OcrPage | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { index, markdown } = value;
  if (typeof index !== "number" || !Number.isFinite(index)) {
    return null;
  }
  if (typeof markdown !== "string") {
    return null;
  }

  const images = parseOcrImages(value.images);
  if (images === null) {
    return null;
  }

  const tables = parseOcrTables(value.tables);
  if (tables === null) {
    return null;
  }

  return {
    index,
    markdown,
    ...(images ? { images } : {}),
    ...(tables ? { tables } : {}),
  };
};

const parseOcrResponse = (value: unknown): OcrResponse | null => {
  if (!isRecord(value)) {
    return null;
  }

  const model = value.model;
  if (model !== undefined && typeof model !== "string") {
    return null;
  }

  if (!Array.isArray(value.pages)) {
    return null;
  }

  const pages: OcrPage[] = [];
  for (const pageValue of value.pages) {
    const page = parseOcrPage(pageValue);
    if (!page) {
      return null;
    }
    pages.push(page);
  }

  return {
    ...(model ? { model } : {}),
    pages,
  };
};

const parseBatchOutputRow = (
  value: unknown
): { customId: string; body: OcrResponse } | null => {
  if (!isRecord(value)) {
    return null;
  }

  const customId = getBatchCustomId(value);
  const body = parseOcrResponse(getBatchBody(value));
  if (!(customId && body)) {
    return null;
  }

  return { customId, body };
};

export const parseMistralBatchOutputLines = (
  jsonl: string
): Array<{ customId: string; body: OcrResponse }> => {
  const rows: Array<{ customId: string; body: OcrResponse }> = [];

  for (const line of jsonl
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean)) {
    try {
      const parsed: unknown = JSON.parse(line);
      const row = parseBatchOutputRow(parsed);
      if (row) {
        rows.push(row);
      }
    } catch {
      // Ignore malformed lines and continue.
    }
  }

  return rows;
};

const ocrBatchDocuments = async (
  documents: OcrDocument[],
  includeImageBase64 = false
): Promise<Map<string, OcrResponse>> => {
  const requests = documents.map((document, index) => ({
    customId: `pdf-${index}`,
    body: {
      model: config.mistralOcrModel,
      document,
      tableFormat: "html",
      includeImageBase64,
      extractHeader: false,
      extractFooter: false,
    },
  }));

  const job = await withOcrRetry(() =>
    client.batch.jobs.create({
      endpoint: "/v1/ocr",
      requests,
      metadata: { pipeline: "avenire-ingestion", mode: "pdf-batch-ocr" },
      timeoutHours: 24,
    })
  );

  const timeoutAt = Date.now() + config.batchPollTimeoutMs;
  let current = job;
  while (Date.now() < timeoutAt) {
    current = await withOcrRetry(() =>
      client.batch.jobs.get({ jobId: job.id, inline: true })
    );
    if (current.status === "SUCCESS") {
      break;
    }
    if (
      current.status === "FAILED" ||
      current.status === "CANCELLED" ||
      current.status === "TIMEOUT_EXCEEDED"
    ) {
      throw new Error(
        `Mistral batch OCR failed with status=${current.status} (jobId=${current.id})`
      );
    }
    await sleep(config.batchPollIntervalMs);
  }

  if (current.status !== "SUCCESS") {
    throw new Error(`Mistral batch OCR timed out (jobId=${job.id})`);
  }

  const result = new Map<string, OcrResponse>();

  if (Array.isArray(current.outputs) && current.outputs.length > 0) {
    for (const output of current.outputs) {
      const row = parseBatchOutputRow(output);
      if (row) {
        result.set(row.customId, row.body);
      }
    }
  }

  const outputFileId = current.outputFile ?? null;
  if (result.size < documents.length && outputFileId) {
    const stream = await withOcrRetry(() =>
      client.files.download({ fileId: outputFileId as string })
    );
    const jsonl = await streamToText(stream);
    const rows = parseMistralBatchOutputLines(jsonl);
    for (const row of rows) {
      result.set(row.customId, row.body);
    }
  }

  if (result.size < documents.length) {
    throw new Error(
      `Batch OCR produced ${result.size}/${documents.length} results. Missing outputs from Mistral batch job ${job.id}.`
    );
  }

  return result;
};

const toCanonicalResource = (
  source: string,
  ocr: OcrResponse,
  includeImageBase64: boolean
): CanonicalResource => {
  const rawChunks = ocr.pages.flatMap((page) => {
    const pageText = normalizePdfPageText(withTablesAndImages(page));
    return semanticChunkText({
      text: pageText,
      sourceType: "pdf",
      source,
      page: page.index + 1,
      baseMetadata: {
        ocrModel: ocr.model ?? config.mistralOcrModel,
        includeImageBase64,
      },
    });
  });
  const chunks = mergeShortChunks(rawChunks);

  return {
    sourceType: "pdf",
    source,
    metadata: {
      pages: ocr.pages.length,
      ocrModel: ocr.model ?? config.mistralOcrModel,
    },
    chunks,
  };
};

export const ingestPdfs = async (
  urls: string[],
  includeImageBase64 = false
): Promise<CanonicalResource[]> => {
  const safeUrls = urls.map((url) => assertSafeUrl(url).toString());
  const nativeResources = await mapWithConcurrency(
    safeUrls,
    config.pdfFetchConcurrency,
    extractNativePdfResource
  );
  const ocrFallbacks = safeUrls.flatMap((source, index) =>
    nativeResources[index]
      ? []
      : [
          {
            index,
            source,
            document: {
              type: "document_url" as const,
              documentUrl: source,
            },
          },
        ]
  );
  const docs = ocrFallbacks.map((fallback) => fallback.document);

  let batchResults: Map<string, OcrResponse> | null = null;
  if (docs.length > 1) {
    batchResults = await ocrBatchDocuments(docs, includeImageBase64);
  }

  const fallbackResources = new Map<number, CanonicalResource>();
  for (const [batchPosition, fallback] of ocrFallbacks.entries()) {
    const ocr =
      batchResults?.get(`pdf-${batchPosition}`) ??
      (await ocrSingleDocument(fallback.document, includeImageBase64));
    fallbackResources.set(
      fallback.index,
      toCanonicalResource(fallback.source, ocr, includeImageBase64)
    );
  }

  return safeUrls.map((source, index) => {
    const resource = nativeResources[index] ?? fallbackResources.get(index);
    if (!resource) {
      throw new Error(`PDF ingestion produced no resource for ${source}.`);
    }
    return resource;
  });
};

export const ingestPdfFiles = async (
  files: Array<{ name: string; bytes: Uint8Array }>,
  includeImageBase64 = false
): Promise<CanonicalResource[]> => {
  if (files.length === 0) {
    return [];
  }

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = file.bytes.buffer.slice(
        file.bytes.byteOffset,
        file.bytes.byteOffset + file.bytes.byteLength
      ) as ArrayBuffer;
      const out = await client.files.upload({
        purpose: "ocr",
        file: new File([arrayBuffer], file.name || "document.pdf", {
          type: "application/pdf",
        }),
      });

      return {
        fileId: out.id,
        source: `pdf:file:${file.name || out.id}`,
      };
    })
  );

  const docs: OcrDocument[] = uploaded.map((item) => ({
    type: "file",
    fileId: item.fileId,
  }));

  let batchResults: Map<string, OcrResponse> | null = null;
  if (docs.length > 1) {
    batchResults = await ocrBatchDocuments(docs, includeImageBase64);
  }

  const resources: CanonicalResource[] = [];

  for (let index = 0; index < docs.length; index += 1) {
    const ocr =
      batchResults?.get(`pdf-${index}`) ??
      (await ocrSingleDocument(docs[index] as OcrDocument, includeImageBase64));

    resources.push(
      toCanonicalResource(
        uploaded[index]?.source ?? `pdf:file:${index}`,
        ocr,
        includeImageBase64
      )
    );
  }

  return resources;
};
