import { createHash } from "node:crypto";
import { findReusableIngestionResource } from "@avenire/database";
import { extractLinkPreview } from "@avenire/ingestion/link";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { uploadStorageFile } from "@avenire/storage";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canStoreBytes } from "@/lib/billing";
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

const ReusableLinkResourceSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
});

function getScreenshotExtension(contentType: string) {
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("jpeg")) {
    return "jpg";
  }
  return "png";
}

async function persistLinkPreviewImage(input: {
  imageUrl: string | null;
  sourceUrl: string;
}) {
  if (!input.imageUrl) {
    return null;
  }

  const reusable = await findReusableIngestionResource({
    source: input.sourceUrl,
    sourceType: "link",
  });
  const reusableMetadata = ReusableLinkResourceSchema.safeParse(
    reusable?.metadata
  );
  if (reusableMetadata.success && reusableMetadata.data.imageUrl) {
    return reusableMetadata.data.imageUrl;
  }

  if (!process.env.UPLOADTHING_TOKEN) {
    return input.imageUrl;
  }

  const response = await fetch(input.imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download Firecrawl screenshot: ${response.status}`
    );
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Firecrawl screenshot response was not an image.");
  }

  const sourceHash = createHash("sha256").update(input.sourceUrl).digest("hex");
  const extension = getScreenshotExtension(contentType);
  const uploaded = await uploadStorageFile({
    body: new Uint8Array(await response.arrayBuffer()),
    contentType,
    key: `uploads/link-previews/${sourceHash}.${extension}`,
    name: `link-preview-${sourceHash}.${extension}`,
  });
  return uploaded.url;
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

  const extractedPreview = await extractLinkPreview(normalizedUrl);
  const imageUrl = await persistLinkPreviewImage({
    imageUrl: extractedPreview.imageUrl,
    sourceUrl: normalizedUrl,
  });
  const linkPreview = {
    ...extractedPreview,
    imageUrl,
    snapshot: extractedPreview.snapshot
      ? { ...extractedPreview.snapshot, imageUrl }
      : null,
  };
  const { fileName, noteTitle } = deriveWorkspaceLinkDocumentTitle({
    requestedName,
    previewTitle: linkPreview.title ?? "",
    normalizedUrl,
  });
  const content = buildWorkspaceLinkNoteContent({
    displayMode: linkPreview.displayMode,
    title: noteTitle,
    url: normalizedUrl,
  });
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
        content: linkPreview.content,
        description: linkPreview.description,
        displayMode: linkPreview.displayMode,
        extractionMode: linkPreview.mode,
        favicon: linkPreview.favicon,
        imageUrl: linkPreview.imageUrl,
        kind: linkPreview.kind,
        mediaUrls: linkPreview.mediaUrls,
        provider: linkPreview.provider ?? null,
        readerMarkdown: linkPreview.readerMarkdown,
        snapshot: linkPreview.snapshot,
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
      fileId: file.id,
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
