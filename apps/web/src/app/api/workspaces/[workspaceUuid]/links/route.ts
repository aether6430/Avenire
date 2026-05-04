import { extractLinkPreview } from "@avenire/ingestion/link";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { consumeUploadUnits } from "@/lib/billing";
import {
  createWorkspaceNoteFile,
  isSharedFilesVirtualFolderId,
  userCanEditFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { getSessionUser } from "@/lib/workspace";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function inferLinkTitle(input: string) {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.replace(/^www\./i, "");
    const pathSegment = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .at(-1);

    const normalizedSegment = pathSegment
      ? decodeURIComponent(pathSegment)
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/[-_]+/g, " ")
          .trim()
      : "";

    return normalizedSegment ? `${host} ${normalizedSegment}` : host;
  } catch {
    return "Imported link";
  }
}

function buildLinkNoteContent(input: { title: string; url: string }) {
  return [
    `# ${input.title}`,
    "",
    `Source: [${input.url}](${input.url})`,
    "",
    "> This link stays lightweight in the note. The extractor runs during ingestion so the extracted content is indexed, but not copied into this file.",
    "",
  ].join("\n");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    folderId?: string;
    name?: string;
    url?: string;
  };

  const folderId =
    typeof body.folderId === "string" ? body.folderId.trim() : "";
  const normalizedUrl = normalizeHttpUrl(body.url);
  const trimmedName = typeof body.name === "string" ? body.name.trim() : "";

  if (!(folderId && normalizedUrl)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (isSharedFilesVirtualFolderId(folderId, workspaceUuid)) {
    return NextResponse.json(
      { error: "Cannot create items in Shared Files" },
      { status: 400 }
    );
  }

  const canEdit = await userCanEditFolder({
    workspaceId: workspaceUuid,
    folderId,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
  }

  const linkPreview = await extractLinkPreview(normalizedUrl);
  const usage = await consumeUploadUnits(user.id, 1);
  if (!usage.ok) {
    return NextResponse.json(
      {
        error: "Upload usage limit reached",
        retryAfter: usage.retryAfter?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  const title = (
    trimmedName ||
    linkPreview.title ||
    inferLinkTitle(normalizedUrl)
  ).slice(0, 255);
  const fileName = /\.mdx?$/i.test(title) ? title : `${title}.md`;
  const noteTitle = fileName.replace(/\.mdx?$/i, "") || "Imported link";

  const file = await createWorkspaceNoteFile({
    workspaceId: workspaceUuid,
    userId: user.id,
    folderId,
    name: fileName,
    content: buildLinkNoteContent({
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
    workspaceId: workspaceUuid,
    fileId: file.id,
    sourceType: "link",
  });

  await Promise.allSettled([
    publishFilesInvalidationEvent({
      workspaceUuid,
      folderId,
      reason: "file.created",
    }),
    publishFilesInvalidationEvent({
      workspaceUuid,
      reason: "tree.changed",
    }),
    publishWorkspaceStreamEvent({
      workspaceUuid,
      type: "ingestion.job",
      payload: {
        createdAt: new Date().toISOString(),
        eventType: "job.queued",
        jobId: job.id,
        payload: {
          status: "queued",
          source: "link.import",
          sourceType: "link",
        },
        workspaceId: workspaceUuid,
      },
    }),
  ]);

  return NextResponse.json({ file, ingestionJob: job }, { status: 201 });
}
