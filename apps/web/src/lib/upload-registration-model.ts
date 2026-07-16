import { createHash } from "node:crypto";
import matter from "gray-matter";
import {
  normalizeFrontmatterProperties,
  type PageMetadataState,
} from "@/lib/frontmatter";
import {
  inferFileMimeTypeFromName,
  resolveFileMimeType,
} from "@avenire/ingestion/file-contract";

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
  return inferFileMimeTypeFromName(name);
}

export function resolveMimeType(input: {
  mimeType?: string | null;
  name: string;
}) {
  const rawMime = input.mimeType?.trim().toLowerCase() ?? "";
  if (rawMime === "application/octet-stream" || rawMime === "unknown") {
    return inferFileMimeTypeFromName(input.name);
  }
  return resolveFileMimeType({
    declaredMimeType: input.mimeType,
    name: input.name,
  });
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

export function assertTrustedUploadStorageUrl(
  storageUrl: string,
  storageKey: string
) {
  const normalized = normalizeUploadThingStorageUrl(storageUrl, storageKey);
  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Invalid uploaded file URL.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!(parsed.protocol === "https:" && (host === "utfs.io" || host.endsWith(".ufs.sh")))) {
    throw new Error("Uploaded file URL is not from a trusted storage host.");
  }

  return normalized;
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
