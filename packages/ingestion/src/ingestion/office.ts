import {
  OfficeParser,
  type ChunkingConfig,
  type OfficeChunk,
  type OfficeParserAST,
} from "officeparser";
import { semanticChunkText } from "./chunking";
import type { CanonicalChunk, CanonicalResource } from "./types";

const OFFICE_FETCH_TIMEOUT_MS = 45_000;

const chunkingConfigForType = (
  type: OfficeParserAST["type"]
): ChunkingConfig => {
  if (type === "pptx" || type === "odp") {
    return {
      strategy: "document-structure",
      splitBy: "slide",
      maxChunkSize: 1400,
      tableSplitStrategy: "row",
      includeMetadata: true,
      addStartIndex: true,
    };
  }

  if (type === "xlsx" || type === "ods" || type === "csv") {
    return {
      strategy: "document-structure",
      splitBy: "sheet",
      maxChunkSize: 1400,
      tableSplitStrategy: "row",
      includeMetadata: true,
      addStartIndex: true,
    };
  }

  return {
    strategy: "document-structure",
    splitBy: "heading",
    maxChunkSize: 1400,
    tableSplitStrategy: "row",
    includeMetadata: true,
    addStartIndex: true,
  };
};

async function fetchOfficeFile(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch office file (${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function withOfficeDeadline<T>(
  task: (signal: AbortSignal) => Promise<T>
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICE_FETCH_TIMEOUT_MS);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOfficeChunkText(chunk: OfficeChunk) {
  return chunk.text.replace(/\s+/g, " ").trim();
}

function toCanonicalChunks(input: {
  chunks: OfficeChunk[];
  provider: string;
  source: string;
}): CanonicalChunk[] {
  return input.chunks
    .map((chunk, index): CanonicalChunk | null => {
      const content = normalizeOfficeChunkText(chunk);
      if (!content) {
        return null;
      }

      const page =
        chunk.metadata.pageNumber ??
        chunk.metadata.slideNumber ??
        (typeof chunk.metadata.sheetName === "string" ? undefined : undefined);

      return {
        chunkIndex: index,
        content,
        kind: chunk.metadata.isTableChunk ? "generic" : "concept",
        metadata: {
          sourceType: "document",
          source: input.source,
          provider: input.provider,
          page,
          modality: "text",
          extra: {
            closestHeading: chunk.metadata.closestHeading,
            endIndex: chunk.endIndex,
            fileType: chunk.metadata.sourceType,
            isTableChunk: chunk.metadata.isTableChunk,
            pageNumber: chunk.metadata.pageNumber,
            sheetName: chunk.metadata.sheetName,
            slideNumber: chunk.metadata.slideNumber,
            startIndex: chunk.startIndex,
          },
        },
      };
    })
    .filter((chunk): chunk is CanonicalChunk => chunk !== null)
    .map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
    }));
}

export async function ingestOfficeDocument(input: {
  source: string;
  title?: string;
  url: string;
}): Promise<CanonicalResource> {
  const { ast, generated } = await withOfficeDeadline(async (signal) => {
    const buffer = await fetchOfficeFile(input.url, signal);
    const parsed = await OfficeParser.parseOffice(buffer, {
      abortSignal: signal,
      ignoreComments: false,
      ignoreNotes: false,
      newlineDelimiter: "\n",
      outputErrorToConsole: false,
    });
    const chunks = await parsed.to("chunks", {
      abortSignal: signal,
      chunksConfig: chunkingConfigForType(parsed.type),
    });

    return { ast: parsed, generated: chunks };
  });
  const provider = `officeparser:${ast.type}`;
  const officeChunks = Array.isArray(generated.value)
    ? (generated.value as OfficeChunk[])
    : [];
  const canonicalChunks = toCanonicalChunks({
    chunks: officeChunks,
    provider,
    source: input.source,
  });

  return {
    chunks:
      canonicalChunks.length > 0
        ? canonicalChunks
        : semanticChunkText({
            text: ast.toText(),
            sourceType: "document",
            source: input.source,
            provider,
            baseMetadata: {
              fileType: ast.type,
              route: "office-parser-fallback",
            },
          }),
    metadata: {
      fileType: ast.type,
      parserWarnings: ast.warnings.length,
    },
    provider,
    source: input.source,
    sourceType: "document",
    title: input.title,
  };
}
