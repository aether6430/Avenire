import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

export const workspaceLinkCreateSchema = Schema.Struct({
  folderId: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

export const WORKSPACE_LINKS_CREATE_ERROR = "Unable to create workspace link.";

export function resolveWorkspaceLinksRouteError(
  error: unknown,
  fallback = WORKSPACE_LINKS_CREATE_ERROR
) {
  return resolveApiErrorMessage(error, fallback);
}

export function normalizeWorkspaceLinkUrl(value: unknown) {
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

function inferWorkspaceLinkTitleFromUrl(input: string) {
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

export function deriveWorkspaceLinkDocumentTitle(input: {
  requestedName: string;
  previewTitle: string;
  normalizedUrl: string;
}) {
  const rawTitle = (
    input.requestedName.trim() ||
    input.previewTitle.trim() ||
    inferWorkspaceLinkTitleFromUrl(input.normalizedUrl)
  )
    .slice(0, 255)
    .trim();

  const stableTitle = rawTitle || "Imported link";
  const fileName = /\.mdx?$/i.test(stableTitle)
    ? stableTitle
    : `${stableTitle}.md`;
  const noteTitle = fileName.replace(/\.mdx?$/i, "") || "Imported link";

  return {
    fileName,
    noteTitle,
  };
}

export function deriveWorkspaceLinkFaviconUrl(normalizedUrl: string) {
  return new URL("/favicon.ico", normalizedUrl).toString();
}

export function buildWorkspaceLinkNoteContent(input: {
  displayMode?: string;
  title: string;
  url: string;
}) {
  const previewLabel =
    input.displayMode === "reader"
      ? "Reader preview"
      : input.displayMode === "embed"
        ? "Embedded preview"
        : "Snapshot preview";

  return [
    `# ${input.title}`,
    "",
    `Source: [${input.url}](${input.url})`,
    "",
    `> ${previewLabel}. The extractor runs during ingestion so the extracted content is indexed without copying the full page into this note.`,
    "",
  ].join("\n");
}

export function buildWorkspaceLinkQueuedEvent(input: {
  workspaceUuid: string;
  jobId: string;
}) {
  return {
    workspaceUuid: input.workspaceUuid,
    type: "ingestion.job" as const,
    payload: {
      createdAt: new Date().toISOString(),
      eventType: "job.queued",
      jobId: input.jobId,
      payload: {
        status: "queued",
        source: "link.import",
        sourceType: "link",
      },
      workspaceId: input.workspaceUuid,
    },
  };
}
