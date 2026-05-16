import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { formatBytes } from "@/components/files/explorer/shared";
import type { WorkspaceFileIndex } from "@/lib/workspace-file-index";

const DEFAULT_RETRIEVAL_LIMIT = 8;
const MAX_SEARCH_SNIPPET_LENGTH = 420;

export type WorkspaceSearchType = "file" | "folder";

export type WorkspaceSearchSourceType =
  | WorkspaceSearchType
  | "audio"
  | "image"
  | "link"
  | "markdown"
  | "pdf"
  | "video";

export interface WorkspaceSearchItem {
  description: string;
  folderId?: string | null;
  id: string;
  path: string;
  snippet: string;
  title: string;
  type: WorkspaceSearchType;
  workspaceUuid?: string;
}

export interface WorkspaceSearchResult {
  chunkId?: string;
  description: string;
  endMs?: number | null;
  fileId?: string | null;
  folderId?: string | null;
  highlightText?: string;
  id: string;
  page?: number | null;
  path?: string;
  score: number;
  snippet: string;
  sourceType?: WorkspaceSearchSourceType;
  startMs?: number | null;
  title: string;
  type: WorkspaceSearchType;
  workspaceUuid?: string;
}

export function resolveWorkspaceRetrievalError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to search workspace content.";
}

export interface WorkspaceRetrievalApiResult {
  chunkId?: string;
  content: string;
  endMs?: number | null;
  fileId?: string | null;
  page?: number | null;
  rerankScore?: number;
  score?: number;
  sourceType?: Exclude<WorkspaceSearchSourceType, WorkspaceSearchType>;
  startMs?: number | null;
  title?: string | null;
}

const normalizeNeedle = (value: string) => value.trim().toLowerCase();

function sanitizeWorkspaceSearchSnippet(value: string): string {
  const cleaned = value
    .replace(/[^\x20-\x7E\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.length > MAX_SEARCH_SNIPPET_LENGTH
    ? `${cleaned.slice(0, MAX_SEARCH_SNIPPET_LENGTH)}...`
    : cleaned;
}

export function createWorkspaceSearchItems(input: {
  files: FileRecord[];
  folders: FolderRecord[];
  workspaceFileIndex: WorkspaceFileIndex<FolderRecord, FileRecord>;
}): WorkspaceSearchItem[] {
  const folderItems = input.folders.map((folder) => ({
    description: "Folder",
    id: folder.id,
    path: input.workspaceFileIndex.folderPathById.get(folder.id) ?? folder.name,
    snippet: "Folder in workspace",
    title: folder.name,
    type: "folder" as const,
  }));

  const fileItems = input.files.map((file) => ({
    description: file.mimeType ?? "File",
    folderId: file.folderId,
    id: file.id,
    path: input.workspaceFileIndex.filePathById.get(file.id) ?? file.name,
    snippet: `${formatBytes(file.sizeBytes)} • ${file.mimeType ?? "unknown type"}`,
    title: file.name,
    type: "file" as const,
  }));

  return [...folderItems, ...fileItems];
}

export function findFastWorkspaceSearchMatch(
  searchQuery: string,
  items: WorkspaceSearchItem[]
): WorkspaceSearchItem | null {
  const needle = normalizeNeedle(searchQuery);
  if (!needle) {
    return null;
  }

  const exactTitleMatch = items.find(
    (item) => normalizeNeedle(item.title) === needle
  );
  if (exactTitleMatch) {
    return exactTitleMatch;
  }

  const exactPathMatch = items.find(
    (item) => normalizeNeedle(item.path ?? "") === needle
  );
  if (exactPathMatch) {
    return exactPathMatch;
  }

  return null;
}

export function mapWorkspaceRetrievalResults(input: {
  items: WorkspaceSearchItem[];
  limit?: number;
  results?: WorkspaceRetrievalApiResult[];
}): WorkspaceSearchResult[] {
  const filesById = new Map(
    input.items
      .filter((item) => item.type === "file")
      .map((item) => [item.id, item] as const)
  );

  const mapped: WorkspaceSearchResult[] = [];
  for (const result of input.results ?? []) {
    const fileId = result.fileId ?? null;
    if (!fileId) {
      continue;
    }

    const item = filesById.get(fileId);
    if (!item) {
      continue;
    }

    const highlightText = (result.content || "").trim();
    const snippet = sanitizeWorkspaceSearchSnippet(
      highlightText || item.snippet || "Match in file content"
    );
    if (!snippet) {
      continue;
    }

    mapped.push({
      chunkId: result.chunkId,
      description: item.description,
      endMs: result.endMs ?? null,
      fileId,
      folderId: item.folderId ?? null,
      highlightText: highlightText || undefined,
      id: item.id,
      page: result.page ?? null,
      path: item.path,
      score: result.rerankScore ?? result.score ?? 0,
      snippet,
      sourceType: result.sourceType,
      startMs: result.startMs ?? null,
      title: item.title,
      type: "file",
      workspaceUuid: item.workspaceUuid,
    });
  }

  return mapped
    .sort(
      (left, right) =>
        right.score - left.score || left.title.localeCompare(right.title)
    )
    .slice(0, input.limit ?? DEFAULT_RETRIEVAL_LIMIT);
}

export async function queryWorkspaceRetrievalApi(input: {
  limit?: number;
  query: string;
  signal?: AbortSignal;
  workspaceUuid: string;
}): Promise<WorkspaceRetrievalApiResult[]> {
  const query = input.query.trim();
  if (!query) {
    return [];
  }

  const response = await fetch("/api/ai/retrieval/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: input.signal,
    body: JSON.stringify({
      workspaceUuid: input.workspaceUuid,
      query,
      limit: input.limit ?? DEFAULT_RETRIEVAL_LIMIT,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error ?? "Unable to search workspace content.");
  }

  const payload = (await response.json()) as {
    results?: WorkspaceRetrievalApiResult[];
  };

  return payload.results ?? [];
}
