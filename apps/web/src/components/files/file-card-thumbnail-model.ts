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
const WORD_SPLIT_REGEX = /\s+/;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

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

function wrapTextLine(text: string, maxChars: number) {
  const words = text.split(WORD_SPLIT_REGEX).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > maxChars) {
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(`${remaining.slice(0, maxChars - 1)}…`);
        remaining = remaining.slice(maxChars - 1);
      }
      current = remaining;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
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

export function buildMarkdownThumbnailSvg(markdown: string, isDark: boolean) {
  const width = 400;
  const height = 250;
  const lines = markdownToPreviewLines(markdown);
  const headlineSource =
    lines.find((line) => line.length > 0) ?? "Untitled note";
  const headlineLines = wrapTextLine(headlineSource, 28).slice(0, 2);
  const bodySource = lines.slice(
    lines.findIndex((line) => line.length > 0) + 1
  );
  const bodyLines = bodySource
    .flatMap((line) => (line ? wrapTextLine(line, 40) : [""]))
    .slice(0, 7);
  const palette = isDark
    ? {
        bodyText: "#3a3a3a",
        innerFill: "#f7f4ee",
        innerStroke: "rgba(17, 24, 39, 0.08)",
        line: "rgba(17, 24, 39, 0.08)",
        outerEnd: "#232323",
        outerStart: "#1b1b1b",
        titleText: "#111827",
      }
    : {
        bodyText: "#4b5563",
        innerFill: "#fffdf8",
        innerStroke: "rgba(17, 24, 39, 0.08)",
        line: "rgba(17, 24, 39, 0.08)",
        outerEnd: "#efe9dc",
        outerStart: "#f7f3ea",
        titleText: "#111827",
      };
  const titleY = 46;
  const bodyY = 88;
  const titleLineHeight = 20;
  const bodyLineHeight = 15;

  const titleSvg = headlineLines
    .map(
      (line, index) =>
        `<text x="32" y="${titleY + index * titleLineHeight}" fill="${palette.titleText}" font-family="Inter, system-ui, sans-serif" font-size="15.5" font-weight="700" letter-spacing="-0.01em">${escapeXml(line)}</text>`
    )
    .join("");

  const bodySvg = bodyLines
    .map((line, index) => {
      if (!line) {
        return "";
      }
      return `<text x="32" y="${bodyY + index * bodyLineHeight}" fill="${palette.bodyText}" font-family="Inter, system-ui, sans-serif" font-size="11.25" font-weight="400">${escapeXml(line)}</text>`;
    })
    .join("");

  const lineDecorations = Array.from({ length: 6 }, (_unused, index) => {
    const y = 106 + index * 18;
    const widthMultiplier = [0.78, 0.94, 0.88, 0.72, 0.91, 0.64][index];
    const x2 = 32 + 304 * widthMultiplier;
    return `<line x1="32" y1="${y}" x2="${x2}" y2="${y}" stroke="${palette.line}" stroke-width="1" />`;
  }).join("");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Markdown preview">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.outerStart}" />
          <stop offset="100%" stop-color="${palette.outerEnd}" />
        </linearGradient>
        <filter id="pageShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.16" />
        </filter>
      </defs>
      <rect width="400" height="250" rx="18" fill="url(#bg)" />
      <rect x="20" y="14" width="360" height="222" rx="14" fill="${palette.innerFill}" filter="url(#pageShadow)" />
      <rect x="20" y="14" width="360" height="222" rx="14" fill="none" stroke="${palette.innerStroke}" />
      <rect x="32" y="28" width="46" height="6" rx="3" fill="${palette.line}" />
      <rect x="32" y="37" width="98" height="2" rx="1" fill="${palette.line}" opacity="0.65" />
      ${titleSvg}
      ${lineDecorations}
      ${bodySvg}
    </svg>`
  )}`;
}
