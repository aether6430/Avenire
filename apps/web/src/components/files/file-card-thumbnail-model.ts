export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return "now";
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  }
  if (diffMonths < 12) {
    return `${diffMonths}mo`;
  }
  return `${diffYears}y`;
}

const MARKDOWN_FRONTMATTER_REGEX = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const MARKDOWN_WIKILINK_REGEX = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;
const MARKDOWN_INLINE_CODE_REGEX = /`([^`]+)`/g;
const MARKDOWN_HEADING_REGEX = /^\s{0,3}#{1,6}\s+/;
const MARKDOWN_BLOCKQUOTE_REGEX = /^\s{0,3}>\s?/;
const MARKDOWN_LIST_REGEX = /^\s{0,3}(?:[-*+]|(?:\d+\.))\s+/;
const MARKDOWN_HORIZONTAL_RULE_REGEX = /^\s{0,3}(?:[-*_]\s?){3,}$/;
const WHITESPACE_REGEX = /\s+/g;

function stripMarkdownFrontmatter(content: string) {
  return content.replace(MARKDOWN_FRONTMATTER_REGEX, "");
}

function normalizeMarkdownLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return "";
  }

  if (MARKDOWN_HORIZONTAL_RULE_REGEX.test(trimmed)) {
    return "";
  }

  const normalized = trimmed
    .replace(MARKDOWN_BLOCKQUOTE_REGEX, "")
    .replace(MARKDOWN_LIST_REGEX, "")
    .replace(MARKDOWN_HEADING_REGEX, "")
    .replace(MARKDOWN_IMAGE_REGEX, (_match, altText: string) => altText || "")
    .replace(MARKDOWN_LINK_REGEX, (_match, label: string) => label || "")
    .replace(
      MARKDOWN_WIKILINK_REGEX,
      (_match, target: string, label?: string) => (label ?? target).trim()
    )
    .replace(MARKDOWN_INLINE_CODE_REGEX, (_match, code: string) => code)
    .replace(/[*_~]/g, "")
    .replace(WHITESPACE_REGEX, " ")
    .trim();

  return normalized;
}

export function markdownToPreviewLines(markdown: string) {
  const normalized = stripMarkdownFrontmatter(markdown).replaceAll(
    "\r\n",
    "\n"
  );
  const rawLines = normalized.split("\n");
  const cleanedLines: string[] = [];
  let previousWasBlank = false;

  for (const rawLine of rawLines) {
    const line = normalizeMarkdownLine(rawLine);
    if (!line) {
      if (!previousWasBlank && cleanedLines.length > 0) {
        cleanedLines.push("");
      }
      previousWasBlank = true;
      continue;
    }

    cleanedLines.push(line);
    previousWasBlank = false;
  }

  while (cleanedLines.at(-1) === "") {
    cleanedLines.pop();
  }

  return cleanedLines;
}
