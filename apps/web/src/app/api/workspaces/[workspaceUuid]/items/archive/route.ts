import {
  getFileAssetById,
  getFolderWithAncestors,
  getNoteContent,
  isMarkdownFileRecord,
  listWorkspaceFiles,
  listWorkspaceFolders,
  userCanAccessWorkspace,
} from "@/lib/file-data";
import { auth } from "@avenire/auth/server";
import { zipSync } from "fflate";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type ArchiveBody = {
  id?: string;
  kind?: "file" | "folder";
  items?: Array<{ id?: string; kind?: "file" | "folder" }>;
};

function sanitizeArchiveSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "untitled";
}

async function fetchFileBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch file payload: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function buildFileArchiveEntry(
  workspaceUuid: string,
  fileId: string
): Promise<{ entryName: string; fileName: string; bytes: Uint8Array } | null> {
  const file = await getFileAssetById(workspaceUuid, fileId);
  if (!file) {
    return null;
  }

  const fileName = sanitizeArchiveSegment(file.name);
  if (isMarkdownFileRecord(file)) {
    const note = await getNoteContent(file.id);
    const content =
      note?.content ??
      (await fetch(file.storageUrl)
        .then((response) => (response.ok ? response.text() : ""))
        .catch(() => ""));

    return {
      entryName: fileName,
      fileName,
      bytes: Buffer.from(content, "utf8"),
    };
  }

  return {
    entryName: fileName,
    fileName,
    bytes: await fetchFileBytes(file.storageUrl),
  };
}

function addArchiveEntry(
  archiveEntries: Record<string, Uint8Array>,
  requestedPath: string,
  bytes: Uint8Array
) {
  if (!archiveEntries[requestedPath]) {
    archiveEntries[requestedPath] = bytes;
    return;
  }

  const lastSlashIndex = requestedPath.lastIndexOf("/");
  const dirname =
    lastSlashIndex >= 0 ? requestedPath.slice(0, lastSlashIndex) : "";
  const basename =
    lastSlashIndex >= 0 ? requestedPath.slice(lastSlashIndex + 1) : requestedPath;
  const dotIndex = basename.lastIndexOf(".");
  const base = dotIndex > 0 ? basename.slice(0, dotIndex) : basename;
  const extension = dotIndex > 0 ? basename.slice(dotIndex) : "";

  let copyIndex = 1;
  while (copyIndex < 10_000) {
    const candidateName = `${base} (${copyIndex})${extension}`;
    const candidatePath = dirname
      ? `${dirname}/${candidateName}`
      : candidateName;
    if (!archiveEntries[candidatePath]) {
      archiveEntries[candidatePath] = bytes;
      return;
    }
    copyIndex += 1;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await userCanAccessWorkspace(session.user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as ArchiveBody;
  const requestedItems =
    body.items
      ?.filter(
        (
          item
        ): item is {
          id: string;
          kind: "file" | "folder";
        } => Boolean(item?.id && item?.kind)
      ) ?? [];

  if (requestedItems.length === 0 && body.id && body.kind) {
    requestedItems.push({ id: body.id, kind: body.kind });
  }

  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const archiveEntries: Record<string, Uint8Array> = {};
  const archiveName =
    requestedItems.length === 1 ? "archive" : "selection";

  const includesFolder = requestedItems.some((item) => item.kind === "folder");
  const [workspaceFolders, workspaceFiles] = includesFolder
    ? await Promise.all([
        listWorkspaceFolders(workspaceUuid, session.user.id),
        listWorkspaceFiles(workspaceUuid, session.user.id),
      ])
    : [[], []];

  const folderById = new Map(workspaceFolders.map((folder) => [folder.id, folder]));

  for (const item of requestedItems) {
    if (item.kind === "file") {
      const entry = await buildFileArchiveEntry(workspaceUuid, item.id);
      if (!entry) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      addArchiveEntry(archiveEntries, entry.entryName, entry.bytes);
      continue;
    }

    const folderTree = await getFolderWithAncestors(
      workspaceUuid,
      item.id,
      session.user.id
    );
    if (!folderTree?.folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const sourceFolder = workspaceFolders.find((folder) => folder.id === item.id);
    if (!sourceFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const sourceFolderIds = new Set<string>([sourceFolder.id]);

    for (const folder of workspaceFolders) {
      let cursor = folder.parentId;
      while (cursor) {
        if (cursor === sourceFolder.id) {
          sourceFolderIds.add(folder.id);
          break;
        }
        cursor = folderById.get(cursor)?.parentId ?? null;
      }
    }

    const rootFolderName = sanitizeArchiveSegment(sourceFolder.name);
    for (const file of workspaceFiles.filter((entry) =>
      sourceFolderIds.has(entry.folderId)
    )) {
      const pathSegments = [rootFolderName];
      let cursor: string | null = file.folderId;
      const folderSegments: string[] = [];
      while (cursor && cursor !== sourceFolder.id) {
        const folder = folderById.get(cursor);
        if (!folder) {
          break;
        }
        folderSegments.unshift(sanitizeArchiveSegment(folder.name));
        cursor = folder.parentId;
      }
      pathSegments.push(...folderSegments);

      const entry = await buildFileArchiveEntry(workspaceUuid, file.id);
      if (!entry) {
        continue;
      }

      addArchiveEntry(
        archiveEntries,
        [...pathSegments, entry.fileName].join("/"),
        entry.bytes
      );
    }
  }

  const zipBytes = zipSync(archiveEntries, { level: 0 });
  const archiveFileName = `${archiveName}.zip`;
  const escapedArchiveFileName = archiveFileName.replace(/"/g, '\\"');
  const encodedArchiveFileName = encodeURIComponent(archiveFileName);
  return new NextResponse(Buffer.from(zipBytes), {
    headers: {
      "Content-Disposition": `attachment; filename="${escapedArchiveFileName}"; filename*=UTF-8''${encodedArchiveFileName}`,
      "Content-Type": "application/zip",
    },
  });
}
