import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { after, NextResponse } from "next/server";
import { canStoreBytes } from "@/lib/billing";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  createWorkspaceNoteFile,
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  buildWorkspaceLinkNoteContent,
  buildWorkspaceLinkQueuedEvent,
  deriveWorkspaceLinkDocumentTitle,
  deriveWorkspaceLinkFaviconUrl,
  normalizeWorkspaceLinkUrl,
} from "./workspace-links-route-model";

interface WorkspaceLinksRouteBody {
  folderId?: string;
  name?: string;
  url?: string;
}

function scheduleLinkIngestionAfterUpload(input: {
  fileId: string;
  folderId: string;
  workspaceUuid: string;
}) {
  after(async () => {
    const publishFileCreated = Promise.allSettled([
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        fileId: input.fileId,
        folderId: input.folderId,
        reason: "file.created",
      }),
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        reason: "tree.changed",
      }),
    ]);

    try {
      const job = await scheduleIngestionJob({
        workspaceId: input.workspaceUuid,
        fileId: input.fileId,
        sourceType: "link",
      });
      await Promise.allSettled([
        publishFileCreated,
        publishWorkspaceStreamEvent(
          buildWorkspaceLinkQueuedEvent({
            workspaceUuid: input.workspaceUuid,
            jobId: job.id,
          })
        ),
      ]);
    } catch (error) {
      await publishFileCreated;
      console.error("link.ingestion_enqueue_failed", {
        workspaceUuid: input.workspaceUuid,
        fileId: input.fileId,
        error,
      });
    }
  });
}

export async function handleWorkspaceLinksPost(input: {
  body: WorkspaceLinksRouteBody;
  userId: string;
  workspaceUuid: string;
}) {
  const folderId =
    typeof input.body.folderId === "string" ? input.body.folderId.trim() : "";
  const normalizedUrl = normalizeWorkspaceLinkUrl(input.body.url);
  const requestedName =
    typeof input.body.name === "string" ? input.body.name.trim() : "";

  if (!(folderId && normalizedUrl)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (isSharedFilesVirtualFolderId(folderId, input.workspaceUuid)) {
    return NextResponse.json(
      { error: "Cannot create items in Shared Files" },
      { status: 400 }
    );
  }

  const canEdit = await userCanEditFolder({
    workspaceId: input.workspaceUuid,
    folderId,
    userId: input.userId,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }

  const { fileName, noteTitle } = deriveWorkspaceLinkDocumentTitle({
    requestedName,
    previewTitle: "",
    normalizedUrl,
  });
  const content = buildWorkspaceLinkNoteContent({
    title: noteTitle,
    url: normalizedUrl,
  });
  const faviconUrl = deriveWorkspaceLinkFaviconUrl(normalizedUrl);
  const storage = await canStoreBytes(
    input.userId,
    Buffer.byteLength(content, "utf8")
  );
  if (!storage.ok) {
    return NextResponse.json(
      { error: "Storage limit reached" },
      { status: 429 }
    );
  }

  const file = await createWorkspaceNoteFile({
    workspaceId: input.workspaceUuid,
    userId: input.userId,
    folderId,
    name: fileName,
    content,
    metadata: {
      type: "note",
      resourceType: "link-resource",
      link: {
        sourceUrl: normalizedUrl,
      },
      page: {
        bannerUrl: null,
        icon: faviconUrl,
        properties: {
          source: {
            type: "text",
            value: normalizedUrl,
          },
        },
      },
    },
  });

  await invalidateWorkspaceReadCaches(input.workspaceUuid);

  scheduleLinkIngestionAfterUpload({
    workspaceUuid: input.workspaceUuid,
    fileId: file.id,
    folderId,
  });

  return NextResponse.json({ file }, { status: 201 });
}
