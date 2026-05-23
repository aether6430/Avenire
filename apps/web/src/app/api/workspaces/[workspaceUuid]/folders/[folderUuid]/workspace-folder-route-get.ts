import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import {
  getFolderWithAncestors,
  isMarkdownFileRecord,
  listFolderContentsForUser,
  listNoteContentByFileIds,
} from "@/lib/file-data";
import { getIngestionFlagsByFileIds } from "@/lib/ingestion-data";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import {
  buildWorkspaceFolderRoutePayload,
  resolveWorkspaceFolderRouteError,
  WORKSPACE_FOLDER_LOAD_ERROR,
} from "./workspace-folder-route-model";

async function hydrateWorkspaceFolderNoteContent(input: {
  markdownFiles: Array<{ id: string; storageUrl: string }>;
}) {
  const noteRows = await listNoteContentByFileIds(
    input.markdownFiles.map((file) => file.id)
  );
  const noteContentByFileId = new Map<string, string | null>();

  await Promise.all(
    input.markdownFiles
      .filter((file) => !noteRows.has(file.id))
      .map(async (file) => {
        const response = await fetch(file.storageUrl, {
          cache: "no-store",
        }).catch(() => null);
        noteContentByFileId.set(
          file.id,
          response?.ok ? await response.text() : null
        );
      })
  );

  for (const [fileId, note] of noteRows) {
    noteContentByFileId.set(fileId, note.content ?? null);
  }

  return noteContentByFileId;
}

export async function handleWorkspaceFolderGet(input: {
  folderUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.workspaceFolder,
      input.workspaceUuid
    );
    const cacheKey = createRouteCacheKey({
      namespace: CACHE_NAMESPACES.workspaceFolder,
      params: { folderUuid: input.folderUuid },
      scope: input.workspaceUuid,
      version,
    });
    const cached = await getCachedRoute<{
      ancestors: unknown[];
      files: unknown[];
      folder: unknown;
      folders: unknown[];
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-workspace-folder-cache": "hit" },
      });
    }

    const [folder, children] = await Promise.all([
      getFolderWithAncestors(
        input.workspaceUuid,
        input.folderUuid,
        input.userId
      ),
      listFolderContentsForUser(
        input.workspaceUuid,
        input.folderUuid,
        input.userId
      ),
    ]);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const files = children.files ?? [];
    const markdownFiles = files.filter((file) => isMarkdownFileRecord(file));
    const [ingestionFlags, noteContentByFileId] = await Promise.all([
      getIngestionFlagsByFileIds(
        input.workspaceUuid,
        files.map((file) => file.id)
      ),
      hydrateWorkspaceFolderNoteContent({
        markdownFiles,
      }),
    ]);

    const payload = buildWorkspaceFolderRoutePayload({
      folder: folder.folder,
      ancestors: folder.ancestors,
      folders: children.folders,
      files,
      ingestionFlags,
      noteContentByFileId,
    });
    await setCachedRoute(CACHE_NAMESPACES.workspaceFolder, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-workspace-folder-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFolderRouteError(
          error,
          WORKSPACE_FOLDER_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
