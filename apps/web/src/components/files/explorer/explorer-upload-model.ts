import { formatBytes } from "@/components/files/explorer/shared";

const DEFAULT_CLIENT_HASH_MAX_BYTES = 12 * 1024 * 1024;

function resolveClientHashMaxBytes() {
  const parsed = Number.parseInt(
    process.env.NEXT_PUBLIC_UPLOAD_DEDUPE_HASH_MAX_BYTES ?? "",
    10
  );
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CLIENT_HASH_MAX_BYTES;
  }
  return parsed;
}

export const CLIENT_HASH_MAX_BYTES = resolveClientHashMaxBytes();
export const ENABLE_PREUPLOAD_DEDUPE =
  (process.env.NEXT_PUBLIC_UPLOAD_PREUPLOAD_DEDUPE ?? "false").toLowerCase() ===
  "true";

export interface ExplorerUploadQueueItem {
  contentHashSha256?: string;
  error?: string;
  failureCount?: number;
  fileId?: string;
  id: string;
  ingestionJobId?: string;
  name: string;
  sizeLabel: string;
  status: "failed" | "ingesting" | "queued" | "uploaded" | "uploading";
  storageKey?: string;
}

export interface ExplorerUploadCandidate {
  file: File;
  relativePath?: string;
}

export interface ExplorerIndexedUploadCandidate {
  candidate: ExplorerUploadCandidate;
  index: number;
  queueItemId: string;
}

export interface ExplorerUploadDedupeLookupInput {
  clientUploadId: string;
  hashSha256: string;
  mimeType: string | null;
  name: string;
  sizeBytes: number;
}

export function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const out: T[][] = [];
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));

  for (let index = 0; index < values.length; index += safeChunkSize) {
    out.push(values.slice(index, index + safeChunkSize));
  }

  return out;
}

export function normalizeRelativePath(
  relativePath: string | undefined,
  file: File
) {
  const raw = (
    relativePath && relativePath.trim().length > 0 ? relativePath : file.name
  ).trim();
  return raw
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/");
}

export function isSkippableUploadArtifact(pathLike: string) {
  const normalized = pathLike.trim().replaceAll("\\", "/");
  const baseName = normalized.split("/").pop()?.toLowerCase() ?? "";
  if (!baseName) {
    return true;
  }

  if (baseName === ".ds_store" || baseName === "thumbs.db") {
    return true;
  }
  if (baseName === "zone.identifier" || baseName.endsWith(":zone.identifier")) {
    return true;
  }

  return false;
}

export function sanitizeUploadCandidates(
  candidates: ExplorerUploadCandidate[]
): ExplorerUploadCandidate[] {
  const seen = new Set<string>();
  const out: ExplorerUploadCandidate[] = [];

  for (const candidate of candidates) {
    const normalizedPath = normalizeRelativePath(
      candidate.relativePath,
      candidate.file
    );
    if (isSkippableUploadArtifact(normalizedPath)) {
      continue;
    }

    const dedupeKey = `${normalizedPath.toLowerCase()}::${candidate.file.size}::${candidate.file.lastModified}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    out.push({
      file: candidate.file,
      relativePath: normalizedPath,
    });
  }

  return out;
}

export async function computeSha256Hex(file: File): Promise<string | null> {
  if (!(globalThis.crypto?.subtle && typeof file.arrayBuffer === "function")) {
    return null;
  }

  try {
    const buffer = await file.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export function shouldHashForClientDedupe(file: File) {
  return file.size > 0 && file.size <= CLIENT_HASH_MAX_BYTES;
}

export function isMarkdownUploadCandidate(file: File) {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    mime === "text/markdown" || name.endsWith(".md") || name.endsWith(".mdx")
  );
}

export function buildExplorerUploadQueueEntries(
  candidates: ExplorerUploadCandidate[],
  createId: () => string = () => crypto.randomUUID()
) {
  const normalizedCandidates = sanitizeUploadCandidates(candidates);
  const queueEntries = normalizedCandidates.map(({ file, relativePath }) => ({
    id: createId(),
    name: relativePath && relativePath !== file.name ? relativePath : file.name,
    sizeLabel: formatBytes(file.size),
    status: "queued" as const,
  }));

  return {
    isFolderUploadBatch: normalizedCandidates.some((entry) =>
      (entry.relativePath ?? entry.file.name).includes("/")
    ),
    normalizedCandidates,
    queueEntries,
  };
}

export function buildExplorerIndexedUploadCandidates(
  normalizedCandidates: ExplorerUploadCandidate[],
  queueEntries: ExplorerUploadQueueItem[]
): ExplorerIndexedUploadCandidate[] {
  return normalizedCandidates.map((candidate, index) => ({
    candidate,
    index,
    queueItemId: queueEntries[index]?.id ?? "",
  }));
}

export function buildExplorerDedupeLookupInput(
  indexedCandidates: ExplorerIndexedUploadCandidate[],
  hashByQueueId: Map<string, string>
): ExplorerUploadDedupeLookupInput[] {
  const input: ExplorerUploadDedupeLookupInput[] = [];

  for (const entry of indexedCandidates) {
    if (isMarkdownUploadCandidate(entry.candidate.file)) {
      continue;
    }
    const hashSha256 = hashByQueueId.get(entry.queueItemId);
    if (!(entry.queueItemId && hashSha256)) {
      continue;
    }

    input.push({
      clientUploadId: entry.queueItemId,
      hashSha256,
      mimeType: entry.candidate.file.type || null,
      name: entry.candidate.file.name,
      sizeBytes: entry.candidate.file.size,
    });
  }

  return input;
}
