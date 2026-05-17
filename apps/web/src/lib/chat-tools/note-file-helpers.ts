import type { ExplorerFileLike } from "@/lib/chat-tools/workspace-file-helpers";

function slugifyTitle(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized.length > 0 ? normalized.slice(0, 80) : "untitled-note";
}

export function toMarkdownFileName(title: string) {
  const base = slugifyTitle(title);
  return base.endsWith(".md") ? base : `${base}.md`;
}

export function sanitizeNoteTitle(value: string | null | undefined) {
  const normalized = (value ?? "")
    .replace(/^["'`#\s]+|["'`#\s]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.:;,!?]+$/g, "")
    .trim()
    .slice(0, 120);

  return normalized.length > 0 ? normalized : "Untitled Note";
}

export function stripNoteExtension(value: string) {
  return value.replace(/\.(md|mdx|txt)$/i, "");
}

export function normalizeNoteFileName(value: string) {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return "untitled-note.md";
  }

  if (/\.(md|mdx|txt)$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.md`;
}

function extractQuotedValues(task: string) {
  return Array.from(task.matchAll(/["']([^"']+)["']/g))
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

export function parseRequestedNoteDestination(task: string) {
  const quotedValues = extractQuotedValues(task);
  const nonPathQuotedValues = quotedValues.filter(
    (value) => !(value.includes("/") || /\.(md|mdx|txt)$/i.test(value))
  );
  const explicitPathCandidate =
    quotedValues.find((value) => value.includes("/") && /\.\w+$/.test(value)) ??
    task
      .match(
        /(?:in|under|inside|at|to)\s+["']?([^"'\n]+?\.(?:md|mdx|txt))["']?/i
      )?.[1]
      ?.trim() ??
    null;

  if (explicitPathCandidate) {
    const cleaned = explicitPathCandidate.replace(/^\/+|\/+$/g, "");
    const parts = cleaned.split("/").filter(Boolean);
    const fileName = parts.pop() ?? cleaned;

    return {
      fileName: normalizeNoteFileName(fileName),
      folderHint: parts.join("/"),
      title: stripNoteExtension(fileName),
    };
  }

  const fileNameCandidate =
    task
      .match(
        /(?:filename|file name)\s*:?\s*["']?([^"'\n]+?(?:\.(?:md|mdx|txt)))["']?/i
      )?.[1]
      ?.trim() ??
    task
      .match(
        /(?:named|called)\s+["']?([^"'\n]+?\.(?:md|mdx|txt))["']?(?=(?:\s+(?:in|under|inside|at|to|with)\b|$))/i
      )?.[1]
      ?.trim() ??
    null;

  const folderHint =
    quotedValues.find(
      (value) => value.includes("/") && !/\.\w+$/.test(value)
    ) ??
    task
      .match(
        /(?:in|under|inside|at|to)\s+["']?([^"'\n]+(?:\/[^"'\n]+)*)["']?(?=(?:\s+(?:named|called|filename|file name|title|about|with)\b|$))/i
      )?.[1]
      ?.trim() ??
    "";

  const titleMatch =
    task.match(/(?:^|\n)\s*title\s*:\s*([^\n]+)/i)?.[1]?.trim() ??
    task
      .match(
        /\b(?:title(?:d)?(?:\s+as)?|named|called)\s+["']?([^"'\n]+?)["']?(?=(?:\s+(?:in|under|inside|at|to|with)\b|$))/i
      )?.[1]
      ?.trim() ??
    task
      .match(
        /\babout\s+["']?([^"'\n]+?)["']?(?=(?:\s+(?:with|in|under|inside|at|to|and)\b|[?.!,]|$))/i
      )?.[1]
      ?.trim() ??
    nonPathQuotedValues[0] ??
    null;
  const fileName = fileNameCandidate
    ? normalizeNoteFileName(fileNameCandidate)
    : null;

  return {
    fileName,
    folderHint,
    title:
      titleMatch || fileName
        ? sanitizeNoteTitle(
            titleMatch ?? (fileName ? stripNoteExtension(fileName) : null)
          )
        : null,
  };
}

export function buildNoteContent(params: { content: string; title: string }) {
  const normalizedContent = params.content.trim();
  return `# ${params.title}\n\n${normalizedContent}\n`;
}

export function stripLeadingTitleHeading(markdown: string, title: string) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown
    .replace(new RegExp(`^#\\s+${escapedTitle}\\s*\\n+`, "i"), "")
    .trim();
}

export function normalizeTagList(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean))
  ).slice(0, 24);
}

export function getFileTags(file: ExplorerFileLike) {
  const property = file.page?.properties?.tags;
  if (!(property && property.type === "multi_select")) {
    return [];
  }
  return normalizeTagList(property.value);
}

export type TagDirective =
  | { action: "add"; tags: string[] }
  | { action: "remove"; tags: string[] }
  | { action: "replace"; tags: string[] };

export function extractTagDirective(task: string): TagDirective | null {
  const clearMatch = task.match(/\bclear\s+tags?\b/i);
  if (clearMatch) {
    return { action: "replace", tags: [] };
  }

  const replaceMatch =
    task.match(/\btags?\s*:\s*([^\n]+)/i) ??
    task.match(/\b(?:set|update|change)\s+tags?\s+(?:to|as)\s+([^\n]+)/i);
  if (replaceMatch?.[1]) {
    return {
      action: "replace",
      tags: normalizeTagList(
        replaceMatch[1]
          .split(/[,\n]/)
          .map((entry) => entry.replace(/^and\s+/i, "").trim())
      ),
    };
  }

  const addMatch = task.match(/\badd\s+tags?\s+([^\n]+)/i);
  if (addMatch?.[1]) {
    return {
      action: "add",
      tags: normalizeTagList(addMatch[1].split(/[,\n]/)),
    };
  }

  const removeMatch = task.match(/\bremove\s+tags?\s+([^\n]+)/i);
  if (removeMatch?.[1]) {
    return {
      action: "remove",
      tags: normalizeTagList(removeMatch[1].split(/[,\n]/)),
    };
  }

  return null;
}
