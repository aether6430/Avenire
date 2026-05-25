import {
  getFileAssetById,
  getNoteContent,
  isMarkdownFileRecord,
} from "@/lib/file-data";
import { normalizeMediaType } from "@/lib/media-type";
import {
  DOCUMENT_SOURCE_TYPES,
  type RetrievalSummaryPayload,
} from "./retrieval-summary-model";

type RetrievalMatch = NonNullable<RetrievalSummaryPayload["matches"]>[number];

export interface RetrievalSummaryEvidenceAttachment {
  data: Uint8Array;
  filename: string;
  mediaType: string;
  type: "file";
}

export interface RetrievalSummaryEvidence {
  attachedFiles: RetrievalSummaryEvidenceAttachment[];
  attemptedFiles: number;
  textualEvidence: string[];
}

interface BuildRetrievalSummaryEvidenceOptions {
  attachmentLimit: number;
  attachmentMaxBytes: number;
  fetchTimeoutMs: number;
  fileIds: string[];
  matches: RetrievalMatch[];
  workspaceUuid: string;
}

export async function buildRetrievalSummaryEvidence({
  attachmentLimit,
  attachmentMaxBytes,
  fetchTimeoutMs,
  fileIds,
  matches,
  workspaceUuid,
}: BuildRetrievalSummaryEvidenceOptions): Promise<RetrievalSummaryEvidence> {
  const groupedMatches = new Map<
    string,
    {
      sourceType:
        | "pdf"
        | "image"
        | "video"
        | "audio"
        | "markdown"
        | "link"
        | null;
      title: string | null;
      snippets: string[];
    }
  >();

  for (const match of matches) {
    const group = groupedMatches.get(match.fileId) ?? {
      sourceType: match.sourceType ?? null,
      title: match.title?.trim() || null,
      snippets: [],
    };

    if (!group.sourceType && match.sourceType) {
      group.sourceType = match.sourceType;
    }

    if (!group.title && match.title?.trim()) {
      group.title = match.title.trim();
    }

    const snippet = match.snippet?.trim();
    if (snippet) {
      group.snippets.push(
        snippet.length > 650 ? `${snippet.slice(0, 650)}...` : snippet
      );
    }

    groupedMatches.set(match.fileId, group);
  }

  const textualEvidence = Array.from(groupedMatches.entries())
    .filter(([, group]) => {
      const sourceType = group.sourceType ?? "";
      return DOCUMENT_SOURCE_TYPES.has(sourceType) || group.snippets.length > 0;
    })
    .slice(0, 8)
    .map(([fileId, group]) => {
      const title = group.title ?? fileId;
      const topSnippets = group.snippets.slice(0, 3);

      return [
        `Document file: ${title} (${fileId})`,
        ...topSnippets.map(
          (snippet, index) => `Chunk ${index + 1}: ${snippet}`
        ),
      ].join("\n");
    });

  const attachmentCandidateIds = Array.from(groupedMatches.entries())
    .filter(([, group]) => !DOCUMENT_SOURCE_TYPES.has(group.sourceType ?? ""))
    .map(([fileId]) => fileId);

  if (attachmentCandidateIds.length === 0) {
    attachmentCandidateIds.push(...fileIds);
  }

  const fileRecords = (
    await Promise.all(
      attachmentCandidateIds
        .slice(0, attachmentLimit * 2)
        .map(async (fileId) => getFileAssetById(workspaceUuid, fileId))
    )
  ).filter((record): record is NonNullable<typeof record> => Boolean(record));

  const attachedFiles = (
    await Promise.all(
      fileRecords.map(async (file) => {
        if (isMarkdownFileRecord(file)) {
          const note = await getNoteContent(file.id);
          const content =
            note?.content ??
            (await fetch(file.storageUrl, {
              cache: "no-store",
              signal: AbortSignal.timeout(fetchTimeoutMs),
            })
              .then(async (response) => {
                if (!response.ok) {
                  return null;
                }

                return response.text();
              })
              .catch(() => null));

          if (content == null) {
            return null;
          }

          const bytes = Buffer.from(content, "utf8");
          return {
            type: "file" as const,
            mediaType: "text/markdown",
            filename: file.name,
            data: bytes,
          };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

        try {
          const response = await fetch(file.storageUrl, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) {
            return null;
          }

          const downloadedType = normalizeMediaType(
            response.headers.get("content-type")
          );
          const mediaType =
            normalizeMediaType(file.mimeType) === "application/octet-stream"
              ? downloadedType
              : normalizeMediaType(file.mimeType);

          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.byteLength === 0 || bytes.byteLength > attachmentMaxBytes) {
            return null;
          }

          return {
            type: "file" as const,
            mediaType,
            filename: file.name,
            data: bytes,
          };
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })
    )
  )
    .filter((part): part is NonNullable<typeof part> => Boolean(part))
    .slice(0, attachmentLimit);

  return {
    attachedFiles,
    attemptedFiles: fileRecords.length,
    textualEvidence,
  };
}
