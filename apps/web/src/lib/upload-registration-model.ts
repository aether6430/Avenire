import { createHash } from "node:crypto";
import matter from "gray-matter";
import {
  normalizeFrontmatterProperties,
  type PageMetadataState,
} from "@/lib/frontmatter";

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

interface MarkdownNotePayload {
  content: string;
  contentHashSha256: string;
  metadata?: Record<string, unknown>;
}

export function normalizeSha256(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return SHA256_HEX_REGEX.test(normalized) ? normalized : null;
}

export function inferMimeTypeFromName(name: string): string | null {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (normalizedName.endsWith(".md")) {
    return "text/markdown";
  }
  if (normalizedName.endsWith(".txt")) {
    return "text/plain";
  }
  if (normalizedName.endsWith(".url")) {
    return "application/url";
  }
  if (normalizedName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalizedName.endsWith(".doc")) {
    return "application/msword";
  }
  if (normalizedName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (normalizedName.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }
  if (normalizedName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (normalizedName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  if (normalizedName.endsWith(".csv")) {
    return "text/csv";
  }
  if (normalizedName.endsWith(".odt")) {
    return "application/vnd.oasis.opendocument.text";
  }
  if (normalizedName.endsWith(".ott")) {
    return "application/vnd.oasis.opendocument.text-template";
  }
  if (normalizedName.endsWith(".odm")) {
    return "application/vnd.oasis.opendocument.text-master";
  }
  if (normalizedName.endsWith(".odp")) {
    return "application/vnd.oasis.opendocument.presentation";
  }
  if (normalizedName.endsWith(".otp")) {
    return "application/vnd.oasis.opendocument.presentation-template";
  }
  if (normalizedName.endsWith(".ods")) {
    return "application/vnd.oasis.opendocument.spreadsheet";
  }
  if (normalizedName.endsWith(".ots")) {
    return "application/vnd.oasis.opendocument.spreadsheet-template";
  }
  if (normalizedName.endsWith(".odg")) {
    return "application/vnd.oasis.opendocument.graphics";
  }
  if (normalizedName.endsWith(".otg")) {
    return "application/vnd.oasis.opendocument.graphics-template";
  }
  if (normalizedName.endsWith(".odf")) {
    return "application/vnd.oasis.opendocument.formula";
  }
  if (normalizedName.endsWith(".odb")) {
    return "application/vnd.oasis.opendocument.database";
  }
  if (normalizedName.endsWith(".rtf")) {
    return "application/rtf";
  }

  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".heic"].some(
      (extension) => normalizedName.endsWith(extension)
    )
  ) {
    return "image/*";
  }

  if (
    [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"].some((extension) =>
      normalizedName.endsWith(extension)
    )
  ) {
    return "video/*";
  }

  if (
    [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"].some((extension) =>
      normalizedName.endsWith(extension)
    )
  ) {
    return "audio/*";
  }

  return null;
}

export function resolveMimeType(input: {
  mimeType?: string | null;
  name: string;
}) {
  const normalizedMime = input.mimeType?.trim().toLowerCase() ?? "";
  if (
    normalizedMime &&
    normalizedMime !== "application/octet-stream" &&
    normalizedMime !== "unknown"
  ) {
    return normalizedMime;
  }

  return inferMimeTypeFromName(input.name) ?? input.mimeType ?? null;
}

export function isMarkdownUpload(input: {
  mimeType?: string | null;
  name: string;
}) {
  const mime = input.mimeType?.toLowerCase() ?? "";
  const normalizedName = input.name.toLowerCase();
  return (
    mime === "text/markdown" ||
    normalizedName.endsWith(".md") ||
    normalizedName.endsWith(".mdx")
  );
}

export function normalizeUploadThingStorageUrl(
  storageUrl: string,
  storageKey: string
) {
  try {
    const parsed = new URL(storageUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === "utfs.io" || host.endsWith(".ufs.sh")) {
      return `https://utfs.io/f/${encodeURIComponent(storageKey)}`;
    }
    return storageUrl;
  } catch {
    return storageUrl;
  }
}

function inferFrontmatterProperty(value: unknown) {
  if (typeof value === "boolean") {
    return { type: "checkbox" as const, value };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "number" as const, value };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return { type: "date" as const, value: trimmed };
    }
    return { type: "text" as const, value: trimmed };
  }
  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  ) {
    return {
      type: "multi_select" as const,
      value: value.map((entry) => entry.trim()),
    };
  }
  return null;
}

export function extractMarkdownNotePayload(input: {
  metadata?: Record<string, unknown>;
  rawContent: string;
}) {
  const parsed = matter(input.rawContent);
  const frontmatterTitle =
    typeof parsed.data?.title === "string" ? parsed.data.title.trim() : "";
  const extractedProperties = Object.fromEntries(
    Object.entries(parsed.data ?? {})
      .map(([key, value]) => {
        if (key.trim().toLowerCase() === "title") {
          return null;
        }
        const normalized = inferFrontmatterProperty(value);
        return normalized ? ([key.trim(), normalized] as const) : null;
      })
      .filter(
        (
          entry
        ): entry is readonly [
          string,
          ReturnType<typeof inferFrontmatterProperty> extends infer T
            ? Exclude<T, null>
            : never,
        ] => Boolean(entry)
      )
  );

  const currentMetadata = input.metadata ?? {};
  const currentPage =
    currentMetadata.page &&
    typeof currentMetadata.page === "object" &&
    !Array.isArray(currentMetadata.page)
      ? (currentMetadata.page as Record<string, unknown>)
      : {};
  const normalizedPage = {
    bannerUrl: null,
    icon: null,
    properties: normalizeFrontmatterProperties(extractedProperties),
  } satisfies PageMetadataState;
  const mergedMetadata = {
    ...currentMetadata,
    page: {
      ...currentPage,
      properties: {
        ...((currentPage.properties as Record<string, unknown> | undefined) ??
          {}),
        ...normalizedPage.properties,
      },
    },
  };
  const cleanedText = parsed.content.replace(/^\n+/, "");
  const hasHeading = /^#\s+.+$/m.test(cleanedText);
  const normalizedContent =
    frontmatterTitle && !hasHeading
      ? `# ${frontmatterTitle}\n\n${cleanedText}`.replace(/\n+$/, "\n")
      : cleanedText;

  return {
    content: normalizedContent,
    contentHashSha256: createHash("sha256")
      .update(normalizedContent)
      .digest("hex"),
    metadata: mergedMetadata,
  } satisfies MarkdownNotePayload;
}
