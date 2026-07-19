"use client";

import {
  type MediaPlaybackSource,
  useMediaPlaybackSource,
} from "@avenire/ui/media";
import { FileCode as FileCode2, FileText } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache";
import { cn } from "@/lib/utils";

type FileCardType =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "video";

interface FileCardProps {
  className?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  fileType: FileCardType;
  lastUpdated: Date;
  matchMeta?: string;
  matchSnippet?: string;
  name: string;
  previewContent?: React.ReactNode;
  previewUrl?: string;
  titleIcon?: React.ReactNode;
  variant?: "grid" | "row";
}

/* ─────────────────────────────────────────────
   Markdown Thumbnail Types
───────────────────────────────────────────── */

type MdBlockBase = { readonly endY: number };

type MdH1Block = MdBlockBase & {
  readonly kind: "h1";
  readonly text: string;
};

type MdH2Block = MdBlockBase & {
  readonly kind: "h2";
  readonly text: string;
};

type MdH3Block = MdBlockBase & {
  readonly kind: "h3";
  readonly text: string;
};

type MdParagraphBlock = MdBlockBase & {
  readonly kind: "paragraph";
  readonly text: string;
};

type MdListBlock = MdBlockBase & {
  readonly kind: "list";
  readonly items: readonly string[];
};

type MdTableBlock = MdBlockBase & {
  readonly kind: "table";
};

type MdCodeBlock = MdBlockBase & {
  readonly kind: "code";
};

type MdImageBlock = MdBlockBase & {
  readonly kind: "image";
};

type MdBlock =
  | MdH1Block
  | MdH2Block
  | MdH3Block
  | MdParagraphBlock
  | MdListBlock
  | MdTableBlock
  | MdCodeBlock
  | MdImageBlock;

interface MarkdownThumbnailProps {
  className?: string;
  content?: string | null;
}

function formatTimeAgo(date: Date): string {
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

const THUMBNAIL_SURFACE_CLASS =
  "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background";

function getFileIcon(fileType: FileCardType): React.ReactNode {
  if (fileType === "code") {
    return <FileCode2 aria-hidden="true" className="h-4 w-4" />;
  }

  const iconByType: Record<FileCardType, string> = {
    archive: "/icons/zip.svg",
    audio: "/icons/audio.svg",
    code: "/icons/_file.svg",
    document: "/icons/text.svg",
    image: "/icons/image.svg",
    other: "/icons/_file.svg",
    video: "/icons/video.svg",
  };

  return (
    <img
      alt=""
      aria-hidden="true"
      className="h-4 w-4"
      height={16}
      loading="lazy"
      src={iconByType[fileType]}
      width={16}
    />
  );
}

export function FileCard({
  className = "",
  details = [],
  fileType,
  lastUpdated,
  matchMeta,
  matchSnippet,
  name,
  previewContent,
  previewUrl,
  titleIcon,
  variant = "grid",
}: FileCardProps) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(lastUpdated));
  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [lastUpdated]);
  const hasPreview = Boolean(previewContent || previewUrl);
  let previewBody: React.ReactNode = null;

  if (previewContent) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:rounded-md [&_img]:h-full [&_img]:w-full [&_img]:rounded-md [&_img]:object-contain [&_video]:h-full [&_video]:w-full [&_video]:rounded-md [&_video]:object-contain">
        {previewContent}
      </div>
    );
  } else if (previewUrl) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md">
        <img
          alt={name}
          className="h-full w-full rounded-md object-cover object-top transition-transform duration-200 ease-[var(--ease-out)] fine-hover:group-hover:scale-[1.02]"
          height={168}
          src={previewUrl}
          width={224}
        />
      </div>
    );
  } else {
    previewBody = (
      <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400 transition-colors group-hover:text-neutral-300">
        <div className="h-8 w-8 opacity-60">{getFileIcon(fileType)}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === "row"
          ? "grid w-full max-w-full grid-cols-[7.5rem_minmax(0,1fr)] items-stretch gap-3 overflow-hidden"
          : "inline-flex w-full max-w-full flex-col items-center gap-2 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "group relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/70",
          variant === "row"
            ? "h-full min-h-24"
            : hasPreview
              ? "h-28"
              : "aspect-[4/3] h-28"
        )}
      >
        {previewBody}
        {hasPreview ? (
          <div className="pointer-events-none absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          {titleIcon ? (
            titleIcon
          ) : (
            <span className="shrink-0 text-muted-foreground">
              {getFileIcon(fileType)}
            </span>
          )}
          <span className="truncate font-medium text-sm" title={name}>
            {name}
          </span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {timeAgo}
          </span>
        </div>
        {matchSnippet ? (
          <div className="min-w-0">
            {matchMeta ? (
              <p className="mb-1 truncate text-[10px] text-muted-foreground">
                {matchMeta}
              </p>
            ) : null}
            <p className="line-clamp-3 text-muted-foreground text-xs leading-5">
              {matchSnippet}
            </p>
          </div>
        ) : null}
        {details.length > 0 ? (
          <div className="flex w-full min-w-0 flex-wrap gap-1.5">
            {details.map((detail) => (
              <span
                className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-background/75 px-2 py-0.5 text-[10px] text-muted-foreground leading-none"
                key={`${detail.label}:${detail.value}`}
                title={`${detail.label}: ${detail.value}`}
              >
                <span className="shrink-0 font-medium text-foreground/75">
                  {detail.label}
                </span>
                <span className="min-w-0 max-w-24 truncate">
                  {detail.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Markdown Thumbnail – SVG Generation

   Parses markdown into structural blocks and renders
   them into a fixed 400×250 SVG. No syntax highlighting,
   table rendering, or image rendering — just structure.
───────────────────────────────────────────── */

const THUMB = {
  W: 400,
  H: 250,
  PAD: 20,
  INNER_W: 360, // W - PAD * 2
} as const;

const FONT = {
  H1_SIZE: 16,
  H1_LINE: 22,
  H2_SIZE: 13,
  H2_LINE: 18,
  H3_SIZE: 11.5,
  H3_LINE: 16,
  BODY_SIZE: 10,
  BODY_LINE: 14,
  PLACEHOLDER_SIZE: 9,
  PLACEHOLDER_LINE: 13,

} as const;

// ── Markdown Block Parser ──────────────────────

function parseMdBlocks(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let cursor = 0;
  let i = 0;

  function addBlock(b: MdBlock) {
    blocks.push(b);
    cursor = b.endY;
  }

  const lines = src.split("\n");
  const total = lines.length;

  while (i < total && cursor < THUMB.H) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Empty line ──
    if (trimmed === "") {
      cursor += 6;
      i++;
      continue;
    }

    // ── Code fence ──
    if (trimmed.startsWith("```")) {
      const fenceStart = i;
      i++;
      while (i < total && !lines[i].trim().startsWith("```")) i++;
      i++; // skip closing fence
      addBlock({ kind: "code", endY: Math.min(cursor + 48, THUMB.H) });
      void fenceStart;
      continue;
    }

    // ── Heading ──
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2];
      if (level === 1) {
        addBlock({ kind: "h1", text, endY: Math.min(cursor + 28, THUMB.H) });
      } else if (level === 2) {
        addBlock({ kind: "h2", text, endY: Math.min(cursor + 24, THUMB.H) });
      } else {
        addBlock({ kind: "h3", text, endY: Math.min(cursor + 22, THUMB.H) });
      }
      i++;
      continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      addBlock({ kind: "paragraph", text: "", endY: Math.min(cursor + 16, THUMB.H) });
      i++;
      continue;
    }

    // ── Table ──
    if (trimmed.includes("|") && i + 1 < total && /\|\s*[-:]+/.test(lines[i + 1])) {
      while (i < total && lines[i].trim().includes("|")) i++;
      addBlock({ kind: "table", endY: Math.min(cursor + 48, THUMB.H) });
      continue;
    }

    // ── Unordered list ──
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < total) {
        const lt = lines[i].trim();
        if (lt === "") break;
        const m = lt.match(/^[-*+]\s+(.*)/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      if (items.length > 0) {
        const linesNeeded = items.length * 2;
        addBlock({
          kind: "list",
          items,
          endY: Math.min(cursor + linesNeeded * FONT.BODY_LINE + 8, THUMB.H),
        });
      }
      continue;
    }

    // ── Ordered list ──
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < total) {
        const lt = lines[i].trim();
        if (lt === "") break;
        const m = lt.match(/^\d+[.)]\s+(.*)/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      if (items.length > 0) {
        const linesNeeded = items.length * 2;
        addBlock({
          kind: "list",
          items,
          endY: Math.min(cursor + linesNeeded * FONT.BODY_LINE + 8, THUMB.H),
        });
      }
      continue;
    }

    // ── Image ──
    if (/^!?\[.*\]\(.*\)/.test(trimmed)) {
      addBlock({ kind: "image", endY: Math.min(cursor + 48, THUMB.H) });
      i++;
      continue;
    }

    // ── Paragraph (default) ──
    {
      const paraLines: string[] = [];
      while (i < total) {
        const lt = lines[i].trim();
        if (lt === "") break;
        // stop if next line starts a new block type
        if (
          lt.startsWith("#") ||
          lt.startsWith("```") ||
          lt.startsWith("---") ||
          lt.startsWith("***") ||
          lt.startsWith("___") ||
          /^[-*+]\s+/.test(lt) ||
          /^\d+[.)]\s+/.test(lt) ||
          /^!?\[.*\]\(.*\)/.test(lt)
        ) {
          break;
        }
        paraLines.push(lt);
        i++;
      }
      const text = paraLines.join(" ");
      if (text.length === 0) {
        cursor += 6;
        continue;
      }
      const est = estimateLines(text, 52);
      addBlock({
        kind: "paragraph",
        text,
        endY: Math.min(cursor + est * FONT.BODY_LINE + 10, THUMB.H),
      });
    }
  }

  return blocks;
}

// ── SVG Text Helpers ───────────────────────────

/** Wrap text into lines by character budget. */
function wrapText(text: string, maxChars: number): string[] {
  if (maxChars <= 0 || text.length === 0) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/** Estimate how many rendered lines a text string will occupy. */
function estimateLines(text: string, maxChars: number): number {
  if (text.length === 0) return 1;
  return Math.max(1, Math.ceil(text.length / maxChars));
}

// ── Block Renderers ────────────────────────────

interface RenderedBlock {
  elements: React.ReactNode;
  endY: number;
}

function renderH1Block(
  block: MdH1Block,
  y: number
): RenderedBlock {
  const text = wrapText(block.text, 42);
  const elements = text.map((line, li) => (
    <text
      key={`h1-${li}`}
      x={THUMB.PAD}
      y={y + (li + 1) * FONT.H1_LINE}
      fill="#e4e4e4"
      fontSize={FONT.H1_SIZE}
      fontFamily="Inter, sans-serif"
      fontWeight="700"
    >
      {line}
    </text>
  ));
  return { elements, endY: block.endY };
}

function renderH2Block(
  block: MdH2Block,
  y: number
): RenderedBlock {
  const text = wrapText(block.text, 48);
  const elements = text.map((line, li) => (
    <text
      key={`h2-${li}`}
      x={THUMB.PAD}
      y={y + (li + 1) * FONT.H2_LINE}
      fill="#d4d4d4"
      fontSize={FONT.H2_SIZE}
      fontFamily="Inter, sans-serif"
      fontWeight="600"
    >
      {line}
    </text>
  ));
  return { elements, endY: block.endY };
}

function renderH3Block(
  block: MdH3Block,
  y: number
): RenderedBlock {
  const text = wrapText(block.text, 52);
  const elements = text.map((line, li) => (
    <text
      key={`h3-${li}`}
      x={THUMB.PAD}
      y={y + (li + 1) * FONT.H3_LINE}
      fill="#c4c4c4"
      fontSize={FONT.H3_SIZE}
      fontFamily="Inter, sans-serif"
      fontWeight="600"
    >
      {line}
    </text>
  ));
  return { elements, endY: block.endY };
}

function renderParagraphBlock(
  block: MdParagraphBlock,
  y: number
): RenderedBlock {
  if (block.text.length === 0) {
    // Horizontal rule — thin divider line
    return {
      elements: (
        <line
          key="hr"
          x1={THUMB.PAD}
          x2={THUMB.PAD + THUMB.INNER_W}
          y1={y + 6}
          y2={y + 6}
          stroke="#3a3a3a"
          strokeWidth="1"
        />
      ),
      endY: block.endY,
    };
  }

  const lines = wrapText(block.text, 52);
  const elements = lines.map((line, li) => (
    <text
      key={`p-${li}`}
      x={THUMB.PAD}
      y={y + (li + 1) * FONT.BODY_LINE}
      fill="#9a9a9a"
      fontSize={FONT.BODY_SIZE}
      fontFamily="Inter, sans-serif"
      fontWeight="400"
    >
      {line}
    </text>
  ));
  return { elements, endY: block.endY };
}

function renderListBlock(
  block: MdListBlock, y: number
): RenderedBlock {
  const items = block.items.slice(0, 10); // cap at 10 items for thumbnail
  const renderedLines: React.ReactNode[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const itemY = y + (idx + 1) * FONT.BODY_LINE;
    // Bullet dot
    renderedLines.push(
      <circle
        key={`lb-${idx}`}
        cx={THUMB.PAD + 3}
        cy={itemY - 3}
        r={1.5}
        fill="#6a6a6a"
      />
    );
    // Item text (wrapped)
    const itemLines = wrapText(items[idx], 48);
    for (let li = 0; li < itemLines.length; li++) {
      renderedLines.push(
        <text
          key={`lt-${idx}-${li}`}
          x={THUMB.PAD + 10}
          y={itemY + li * FONT.BODY_LINE}
          fill="#9a9a9a"
          fontSize={FONT.BODY_SIZE}
          fontFamily="Inter, sans-serif"
          fontWeight="400"
        >
          {itemLines[li]}
        </text>
      );
    }
  }

  return { elements: renderedLines, endY: block.endY };
}

function renderTableBlock(y: number): RenderedBlock {
  const boxH = 36;
  return {
    elements: (
      <g key="table">
        <rect
          x={THUMB.PAD}
          y={y + 4}
          width={THUMB.INNER_W}
          height={boxH}
          rx={4}
          fill="#1e1e1e"
          stroke="#2e2e2e"
          strokeWidth="1"
        />
        {/* Simulated row separators */}
        <line
          x1={THUMB.PAD + 8}
          x2={THUMB.PAD + THUMB.INNER_W - 8}
          y1={y + 16}
          y2={y + 16}
          stroke="#2a2a2a"
          strokeWidth="0.5"
        />
        <line
          x1={THUMB.PAD + 8}
          x2={THUMB.PAD + THUMB.INNER_W - 8}
          y1={y + 28}
          y2={y + 28}
          stroke="#2a2a2a"
          strokeWidth="0.5"
        />
        <text
          x={THUMB.PAD + THUMB.INNER_W / 2}
          y={y + 24}
          fill="#555"
          fontSize={FONT.PLACEHOLDER_SIZE}
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          textAnchor="middle"
        >
          [TABLE]
        </text>
      </g>
    ),
    endY: Math.min(y + boxH + 12, THUMB.H),
  };
}

function renderCodeBlock(y: number): RenderedBlock {
  const boxH = 40;
  return {
    elements: (
      <g key="code">
        <rect
          x={THUMB.PAD}
          y={y + 4}
          width={THUMB.INNER_W}
          height={boxH}
          rx={4}
          fill="#161821"
          stroke="#2a2d3a"
          strokeWidth="1"
        />
        {/* Fake code lines */}
        <line
          x1={THUMB.PAD + 10}
          x2={THUMB.PAD + 80}
          y1={y + 16}
          y2={y + 16}
          stroke="#3a3f50"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={THUMB.PAD + 10}
          x2={THUMB.PAD + 120}
          y1={y + 24}
          y2={y + 24}
          stroke="#3a3f50"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={THUMB.PAD + 10}
          x2={THUMB.PAD + 60}
          y1={y + 32}
          y2={y + 32}
          stroke="#3a3f50"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x={THUMB.PAD + THUMB.INNER_W / 2}
          y={y + 26}
          fill="#555"
          fontSize={FONT.PLACEHOLDER_SIZE}
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          textAnchor="middle"
        >
          [CODE]
        </text>
      </g>
    ),
    endY: Math.min(y + boxH + 12, THUMB.H),
  };
}

function renderImageBlock(y: number): RenderedBlock {
  const boxH = 40;
  return {
    elements: (
      <g key="image">
        <rect
          x={THUMB.PAD}
          y={y + 4}
          width={THUMB.INNER_W}
          height={boxH}
          rx={4}
          fill="#1a1a1a"
          stroke="#2a2a2a"
          strokeWidth="1"
        />
        {/* Mountain icon (simplified) */}
        <path
          d={`M${THUMB.PAD + THUMB.INNER_W / 2 - 12},${y + boxH - 6} l-8,-14 l6,8 l4,-6 l10,12z`}
          fill="#2a2a2a"
        />
        <text
          x={THUMB.PAD + THUMB.INNER_W / 2}
          y={y + 24}
          fill="#555"
          fontSize={FONT.PLACEHOLDER_SIZE}
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          textAnchor="middle"
        >
          [IMAGE]
        </text>
      </g>
    ),
    endY: Math.min(y + boxH + 12, THUMB.H),
  };
}

// ── Content Hash for Cache ─────────────────────

function hashContent(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// ── MarkdownThumbnail Component ────────────────

export function MarkdownThumbnail({
  className,
  content,
}: MarkdownThumbnailProps) {
  const raw = typeof content === "string" ? content.trim() : "";

  const svgData = useMemo(() => {
    if (raw.length === 0) {
      return { hash: "empty", blocks: [] as MdBlock[] };
    }
    const blocks = parseMdBlocks(raw);
    return { hash: hashContent(raw), blocks };
  }, [raw]);

  let renderY = 0;

  const renderedBlocks: RenderedBlock[] = [];
  for (const block of svgData.blocks) {
    const y = renderY;
    if (y >= THUMB.H) break;

    let rendered: RenderedBlock;
    switch (block.kind) {
      case "h1":
        rendered = renderH1Block(block, y);
        break;
      case "h2":
        rendered = renderH2Block(block, y);
        break;
      case "h3":
        rendered = renderH3Block(block, y);
        break;
      case "paragraph":
        rendered = renderParagraphBlock(block, y);
        break;
      case "list":
        rendered = renderListBlock(block, y);
        break;
      case "table":
        rendered = renderTableBlock(y);
        break;
      case "code":
        rendered = renderCodeBlock(y);
        break;
      case "image":
        rendered = renderImageBlock(y);
        break;
    }

    renderedBlocks.push(rendered);
    renderY = rendered.endY + 10; // 10px gap between blocks
  }

  const clipId = `md-thumb-${svgData.hash}`;

  return (
    <div
      className={cn(
        THUMBNAIL_SURFACE_CLASS,
        "pointer-events-none select-none bg-[#151515] p-1.5",
        className
      )}
      aria-hidden="true"
    >
      {raw.length > 0 ? (
        <svg
          viewBox={`0 0 ${THUMB.W} ${THUMB.H}`}
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full rounded-[5px] border border-white/8 bg-[#191919]"
          style={{ imageRendering: "auto" }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={0}
                y={0}
                width={THUMB.W}
                height={THUMB.H}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {renderedBlocks.map((rb, ri) => (
              <g key={`block-${ri}`}>{rb.elements}</g>
            ))}
          </g>
        </svg>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-muted/30 text-muted-foreground">
          <FileCode2 aria-hidden="true" className="size-4" />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   VideoThumbnail
   Renders the first frame of a video file.
───────────────────────────────────────────── */
export function VideoThumbnail({
  playbackSource,
  posterUrl,
  className,
  warm = false,
  openedCached = false,
  playOnHover = false,
  sizeBytes,
}: {
  playbackSource: MediaPlaybackSource;
  posterUrl?: string | null;
  className?: string;
  warm?: boolean;
  openedCached?: boolean;
  playOnHover?: boolean;
  sizeBytes?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedPlaybackSource, setResolvedPlaybackSource] = useState(() =>
    resolveCachedPlaybackSource(playbackSource)
  );
  const [failed, setFailed] = useState(false);

  useMediaPlaybackSource({
    mediaRef: videoRef,
    onError: () => setFailed(true),
    playbackSource: resolvedPlaybackSource,
  });

  useEffect(() => {
    setFailed(false);
    setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
  }, [playbackSource]);

  useEffect(() => {
    if (!(warm || openedCached || playOnHover)) {
      return;
    }

    primeMediaPlayback(playbackSource, {
      mediaType: "video",
      posterUrl,
      sizeBytes,
      surface: "thumbnail",
    })
      .then(() => {
        setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
      })
      .catch(() => {
        // Ignore warmup failures for thumbnails.
      });

    return () => {
      releaseMediaPlaybackPrime(playbackSource);
    };
  }, [openedCached, playOnHover, playbackSource, posterUrl, sizeBytes, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (!(warm || openedCached)) {
      return;
    }
    // Seek to first frame once metadata is ready.
    const onMeta = () => {
      video.currentTime = 0;
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.load();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [openedCached, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!playOnHover) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const startPlayback = async () => {
      try {
        video.loop = true;
        await video.play();
      } catch {
        // Ignore autoplay failures for previews.
      }
    };

    startPlayback().catch(() => {
      // Ignore playback bootstrap failures for thumbnails.
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [playOnHover]);

  if (failed) {
    return (
      <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
        <FileText className="size-8 text-violet-500" />
      </div>
    );
  }

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      <video
        className="h-full w-full object-contain"
        muted
        onError={() => setFailed(true)}
        playsInline
        poster={posterUrl ?? undefined}
        preload={warm || openedCached || playOnHover ? "auto" : "none"}
        ref={videoRef}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PdfThumbnail
   Renders the first page of a PDF onto a canvas.
───────────────────────────────────────────── */
export function PdfThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfPage() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjsLib.getDocument({ url: src, verbosity: 0 })
        .promise;
      if (cancelled) {
        return null;
      }

      const page = await pdf.getPage(1);
      if (cancelled) {
        return null;
      }

      return page;
    }

    async function render() {
      try {
        const page = await loadPdfPage();
        if (!page) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        // Render at 1.5× for a crisper thumbnail
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    render().catch(() => {
      if (!cancelled) {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
        <FileText className="size-8 text-rose-500" />
      </div>
    );
  }

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70">
          <FileText className="size-8 text-rose-400" />
        </div>
      )}
      <canvas
        className="h-full w-full object-contain"
        ref={canvasRef}
        style={{ opacity: ready ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}
