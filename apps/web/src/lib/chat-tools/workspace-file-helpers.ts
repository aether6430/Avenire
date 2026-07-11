import { getIngestionSummaryForFile } from "@avenire/database";
import {
  parseRequestedNoteDestination,
  stripNoteExtension,
} from "@/lib/chat-tools/note-file-helpers";
import {
  getFileAssetById,
  getNoteContent,
  isMarkdownFileRecord,
  isSharedFilesVirtualFolderId,
  listWorkspaceFiles,
  listWorkspaceFolders,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { retrieveWorkspaceChunksShared } from "@/lib/retrieval-service";

const DEFAULT_NOTE_MAX_CHARS = 16_000;
const NOTE_TEXT_BYTE_LIMIT = 512_000;

export type ExplorerFileLike = Awaited<
  ReturnType<typeof listWorkspaceFiles>
>[number];

export interface WorkspacePathMaps {
  filePathById: Map<string, string>;
  folderPathById: Map<string, string>;
}

export function isMarkdownFile(file: ExplorerFileLike) {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.name.toLowerCase();
  return (
    mime.startsWith("text/markdown") ||
    mime.startsWith("text/plain") ||
    name.endsWith(".md") ||
    name.endsWith(".mdx") ||
    name.endsWith(".txt")
  );
}

export async function buildWorkspacePathMaps(
  workspaceId: string,
  userId: string
): Promise<WorkspacePathMaps> {
  const [folders, files] = await Promise.all([
    listWorkspaceFolders(workspaceId, userId),
    listWorkspaceFiles(workspaceId, userId),
  ]);

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const folderPathCache = new Map<string, string>();

  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) {
      return "";
    }

    const cached = folderPathCache.get(folderId);
    if (typeof cached === "string") {
      return cached;
    }

    const folder = folderById.get(folderId);
    if (!folder) {
      return "";
    }

    const parentPath = getFolderPath(folder.parentId);
    const currentSegment = folder.parentId === null ? "" : folder.name;
    const nextPath = [parentPath, currentSegment].filter(Boolean).join("/");
    folderPathCache.set(folderId, nextPath);
    return nextPath;
  };

  const filePathById = new Map<string, string>();
  for (const folder of folders) {
    getFolderPath(folder.id);
  }
  for (const file of files) {
    const folderPath = getFolderPath(file.folderId);
    filePathById.set(
      file.id,
      [folderPath, file.name].filter(Boolean).join("/")
    );
  }

  return {
    filePathById,
    folderPathById: folderPathCache,
  };
}

export async function fetchWorkspaceFileText(
  file: ExplorerFileLike,
  maxChars = DEFAULT_NOTE_MAX_CHARS
) {
  if (!isMarkdownFile(file)) {
    throw new Error("Only markdown and text files can be read as notes.");
  }

  if (isMarkdownFileRecord(file)) {
    const note = await getNoteContent(file.id);
    const text =
      note?.content ??
      (await fetch(file.storageUrl, { cache: "no-store" }).then(
        async (response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch file content (${response.status}).`
            );
          }
          return response.text();
        }
      ));
    if (Buffer.byteLength(text, "utf8") > NOTE_TEXT_BYTE_LIMIT) {
      throw new Error("The note is too large to load into chat context.");
    }
    return text.slice(0, Math.max(250, maxChars));
  }

  const response = await fetch(file.storageUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch file content (${response.status}).`);
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > NOTE_TEXT_BYTE_LIMIT) {
    throw new Error("The note is too large to load into chat context.");
  }

  return text.slice(0, Math.max(250, maxChars));
}

export function getWorkspacePathForFile(
  file: Pick<ExplorerFileLike, "id" | "name">,
  maps: WorkspacePathMaps
) {
  return maps.filePathById.get(file.id) ?? file.name ?? "Untitled file";
}

export function normalizeWorkspacePath(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();
}

export function resolveFolderIdByPathHint(
  maps: WorkspacePathMaps,
  rootFolderId: string,
  hint?: string
) {
  if (typeof hint !== "string") {
    return null;
  }

  const normalizedHint = normalizeWorkspacePath(hint);
  if (!normalizedHint) {
    return rootFolderId;
  }

  for (const [folderId, folderPath] of maps.folderPathById.entries()) {
    if (normalizeWorkspacePath(folderPath) === normalizedHint) {
      return folderId;
    }
  }

  if (normalizedHint.includes("/")) {
    return null;
  }

  let matchedFolderId: string | null = null;
  for (const [folderId, folderPath] of maps.folderPathById.entries()) {
    const normalizedPath = normalizeWorkspacePath(folderPath);
    if (
      normalizedPath === normalizedHint ||
      normalizedPath.endsWith(`/${normalizedHint}`)
    ) {
      if (matchedFolderId) {
        return null;
      }
      matchedFolderId = folderId;
    }
  }

  if (matchedFolderId) {
    return matchedFolderId;
  }

  if (normalizedHint === "root" || normalizedHint === "workspace") {
    return rootFolderId;
  }

  return null;
}

export function resolveFileIdByPathHint(
  maps: WorkspacePathMaps,
  hint?: string
) {
  if (typeof hint !== "string") {
    return null;
  }

  const normalizedHint = normalizeWorkspacePath(hint);
  if (!normalizedHint) {
    return null;
  }

  for (const [fileId, filePath] of maps.filePathById.entries()) {
    if (normalizeWorkspacePath(filePath) === normalizedHint) {
      return fileId;
    }
  }

  if (normalizedHint.includes("/")) {
    return null;
  }

  let matchedFileId: string | null = null;
  for (const [fileId, filePath] of maps.filePathById.entries()) {
    const normalizedPath = normalizeWorkspacePath(filePath);
    if (
      normalizedPath === normalizedHint ||
      normalizedPath.endsWith(`/${normalizedHint}`)
    ) {
      if (matchedFileId) {
        return null;
      }
      matchedFileId = fileId;
    }
  }

  return matchedFileId;
}

export async function readWorkspaceFileContent(params: {
  workspaceId: string;
  file: ExplorerFileLike;
  maps: WorkspacePathMaps;
  maxChars?: number;
}) {
  const workspacePath = getWorkspacePathForFile(params.file, params.maps);
  const maxChars = params.maxChars ?? DEFAULT_NOTE_MAX_CHARS;

  if (isMarkdownFile(params.file)) {
    return {
      content: await fetchWorkspaceFileText(params.file, maxChars),
      fileId: params.file.id,
      mimeType: params.file.mimeType ?? null,
      name: params.file.name,
      readMode: "text" as const,
      updatedAt: params.file.updatedAt,
      workspacePath,
    };
  }

  const summary = await getIngestionSummaryForFile(
    params.workspaceId,
    params.file.id
  );
  const summaryChunks =
    summary?.resources.flatMap((resource) => resource.chunks) ?? [];

  const content = summaryChunks
    .slice(0, 5)
    .map((chunk) => chunk.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, Math.max(250, maxChars));

  if (!content) {
    throw new Error(
      "No readable content is available for this file yet. Try get_file_summary after ingestion finishes."
    );
  }

  return {
    content,
    fileId: params.file.id,
    mimeType: params.file.mimeType ?? null,
    name: params.file.name,
    readMode: "summary" as const,
    updatedAt: params.file.updatedAt,
    workspacePath,
  };
}

export async function publishTreeMutationEvents(input: {
  fileId?: string | null;
  folderId?: string | null;
  reason: "file.created" | "file.deleted" | "file.updated";
  workspaceId: string;
}) {
  await Promise.allSettled([
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceId,
      folderId: input.folderId ?? undefined,
      fileId: input.fileId ?? undefined,
      reason: input.reason,
    }),
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceId,
      reason: "tree.changed",
    }),
  ]);
}

export function findTargetNoteFile(params: {
  maps: WorkspacePathMaps;
  noteFiles: ExplorerFileLike[];
  requireExplicitTarget?: boolean;
  task: string;
}) {
  const explicitFileId =
    params.task.match(/workspace-file:\/\/([a-z0-9-]+)/i)?.[1]?.trim() ??
    params.task.match(/\bfile\s*id\b\s*[:=]\s*([a-z0-9-]+)/i)?.[1]?.trim() ??
    params.task.match(/\bfileId\b\s*[:=]\s*([a-z0-9-]+)/i)?.[1]?.trim() ??
    null;

  if (explicitFileId) {
    return params.noteFiles.find((file) => file.id === explicitFileId) ?? null;
  }

  const destination = parseRequestedNoteDestination(params.task);
  const directPath =
    (destination.folderHint && destination.fileName
      ? `${destination.folderHint}/${destination.fileName}`
      : destination.fileName) ?? undefined;
  const resolvedByPath = resolveFileIdByPathHint(params.maps, directPath);

  if (resolvedByPath) {
    return params.noteFiles.find((file) => file.id === resolvedByPath) ?? null;
  }

  if (params.requireExplicitTarget) {
    return null;
  }

  const normalizedTitle = stripNoteExtension(
    destination.title ?? ""
  ).toLowerCase();
  if (normalizedTitle) {
    const exactMatches = params.noteFiles.filter(
      (file) => stripNoteExtension(file.name).toLowerCase() === normalizedTitle
    );
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
  }

  return params.noteFiles.length === 1 ? params.noteFiles[0] : null;
}

export function mapSearchResultsToCitations(params: {
  maps: WorkspacePathMaps;
  results: Awaited<ReturnType<typeof retrieveWorkspaceChunksShared>>["results"];
}) {
  return params.results.map((match) => ({
    chunkId: match.chunkId,
    endMs: match.endMs ?? null,
    fileId: match.fileId,
    page: match.page ?? null,
    score: match.score,
    snippet: match.content.trim(),
    sourceType: match.sourceType,
    startMs: match.startMs ?? null,
    title: match.title?.trim() ?? null,
    workspacePath:
      (match.fileId ? params.maps.filePathById.get(match.fileId) : null) ??
      match.title?.trim() ??
      match.source.trim(),
  }));
}

export async function resolveWorkspaceSearchMatches(params: {
  workspaceId: string;
  userId: string;
  query: string;
  limit: number;
  mode?: Parameters<typeof retrieveWorkspaceChunksShared>[0]["mode"];
  sourceType?: Parameters<
    typeof retrieveWorkspaceChunksShared
  >[0]["sourceType"];
}) {
  const [result, maps] = await Promise.all([
    retrieveWorkspaceChunksShared({
      query: params.query,
      limit: params.limit,
      mode: params.mode,
      origin: "chat",
      sourceType: params.sourceType,
      userId: params.userId,
      workspaceId: params.workspaceId,
    }),
    buildWorkspacePathMaps(params.workspaceId, params.userId),
  ]);
  const matches = mapSearchResultsToCitations({
    maps,
    results: result.results,
  });

  return { maps, matches };
}

export async function resolveFileExcerpt(params: {
  workspaceId: string;
  fileId: string;
  maxChars: number;
  maps: WorkspacePathMaps;
}) {
  const file = await getFileAssetById(params.workspaceId, params.fileId);
  if (!file) {
    return null;
  }

  try {
    const result = await readWorkspaceFileContent({
      workspaceId: params.workspaceId,
      file,
      maps: params.maps,
      maxChars: params.maxChars,
    });
    if (!result.content.trim()) {
      return null;
    }

    return {
      excerpt: result.content,
      fileId: result.fileId,
      workspacePath: result.workspacePath,
    };
  } catch {
    return null;
  }
}

export async function ensureWritableTargetFolder(
  input: {
    workspaceId: string;
    userId: string;
  },
  folderId: string
) {
  if (isSharedFilesVirtualFolderId(folderId, input.workspaceId)) {
    throw new Error("Files cannot be moved into Shared Files.");
  }

  const canEdit = await userCanEditFolder({
    workspaceId: input.workspaceId,
    folderId,
    userId: input.userId,
  });

  if (!canEdit) {
    throw new Error("The destination folder is read-only.");
  }
}
