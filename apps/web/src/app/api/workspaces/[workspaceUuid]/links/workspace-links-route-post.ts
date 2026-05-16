import { extractLinkPreview } from "@avenire/ingestion/link";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { consumeUploadUnits } from "@/lib/billing-metering";
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
  normalizeWorkspaceLinkUrl,
} from "./workspace-links-route-model";

interface WorkspaceLinksRouteBody {
  folderId?: string;
  name?: string;
  url?: string;
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

  const linkPreview = await extractLinkPreview(normalizedUrl);
  const usage = await consumeUploadUnits(input.userId, 1);
  if (!usage.ok) {
    return NextResponse.json(
      {
        error: "Upload usage limit reached",
        retryAfter: usage.retryAfter?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  const { fileName, noteTitle } = deriveWorkspaceLinkDocumentTitle({
    requestedName,
    previewTitle: linkPreview.title ?? "",
    normalizedUrl,
  });

  const file = await createWorkspaceNoteFile({
    workspaceId: input.workspaceUuid,
    userId: input.userId,
    folderId,
    name: fileName,
    content: buildWorkspaceLinkNoteContent({
      title: noteTitle,
      url: normalizedUrl,
    }),
    metadata: {
      type: "note",
      resourceType: "link-resource",
      link: {
        favicon: linkPreview.favicon,
        title: linkPreview.title,
        sourceUrl: normalizedUrl,
      },
      page: {
        bannerUrl: null,
        icon: linkPreview.favicon ?? "🔗",
        properties: {
          source: {
            type: "text",
            value: normalizedUrl,
          },
        },
      },
    },
  });

  const job = await scheduleIngestionJob({
    workspaceId: input.workspaceUuid,
    fileId: file.id,
    sourceType: "link",
  });

  await Promise.allSettled([
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      folderId,
      reason: "file.created",
    }),
    publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    }),
    publishWorkspaceStreamEvent(
      buildWorkspaceLinkQueuedEvent({
        workspaceUuid: input.workspaceUuid,
        jobId: job.id,
      })
    ),
  ]);

  return NextResponse.json({ file, ingestionJob: job }, { status: 201 });
}
