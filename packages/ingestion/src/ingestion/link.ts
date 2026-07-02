import { tavily } from "@tavily/core";
import { Defuddle as parseDefuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import { config } from "../config";
import { assertSafeUrl } from "../utils/safety";
import { semanticChunkText } from "./chunking";
import { extractFromSupportedProvider } from "./provider-extractors";
import type { CanonicalResource } from "./types";

export type LinkExtractionMode = "provider" | "reader" | "tavily" | "metadata";
export type LinkPreviewKind = "article" | "provider" | "snapshot";
export type LinkPreviewDisplayMode = "embed" | "reader" | "snapshot";

export interface LinkSnapshotPreview {
  capturedAt: string;
  contentText: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  title: string | null;
}

export interface LinkPreview {
  content: string;
  description: string | null;
  displayMode: LinkPreviewDisplayMode;
  favicon: string | null;
  imageUrl: string | null;
  kind: LinkPreviewKind;
  mediaUrls: string[];
  mode: LinkExtractionMode;
  provider?: string;
  readerMarkdown: string | null;
  snapshot: LinkSnapshotPreview | null;
  title: string | null;
}

const extractViaTavily = async (
  url: string
): Promise<{ title: string | null; content: string }> => {
  if (!config.tavilyApiKey) {
    throw new Error("TAVILY_API_KEY is required for tavily link extraction.");
  }

  const client = tavily({ apiKey: config.tavilyApiKey });
  const payload = (await client.extract([url])) as {
    results?: Array<{
      title?: string;
      rawContent?: string;
      raw_content?: string;
      content?: string;
    }>;
    title?: string;
    rawContent?: string;
    raw_content?: string;
    content?: string;
  };

  const item = payload.results?.[0] ?? payload;
  const content = (
    item.rawContent ??
    item.raw_content ??
    item.content ??
    ""
  ).trim();
  if (!content) {
    throw new Error(`Tavily returned empty content for ${url}`);
  }

  return {
    title: item.title ?? payload.title ?? null,
    content,
  };
};

const fetchHtml = async (
  url: string,
  init?: Pick<RequestInit, "signal">
): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    },
    signal: init?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
};

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const escapeForPattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMetaValue = (html: string, property: string): string | null => {
  const escaped = escapeForPattern(property);
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
};

const getTitleFromHtml = (html: string): string | null => {
  const ogTitle = getMetaValue(html, "og:title");
  if (ogTitle) {
    return ogTitle;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? normalizeWhitespace(titleMatch[1]) : null;
};

const getPageImageFromHtml = (html: string): string | null =>
  getMetaValue(html, "og:image") ?? getMetaValue(html, "twitter:image");

const resolvePreviewImageUrl = (
  imageUrl: string | null,
  sourceUrl: URL
): string | null => {
  if (!imageUrl) {
    return null;
  }
  try {
    const resolved = new URL(decodeHtmlEntities(imageUrl), sourceUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? resolved.toString()
      : null;
  } catch {
    return null;
  }
};

const getDescriptionFromHtml = (html: string): string | null =>
  getMetaValue(html, "description") ??
  getMetaValue(html, "og:description") ??
  getMetaValue(html, "twitter:description");

const getPlainTextFromHtml = (html: string): string => {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
  );
};

const getWordCount = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).filter(Boolean).length;
};

const decodeHtmlEntities = (value: string): string => {
  const { document } = parseHTML("<textarea></textarea>");
  const textarea = document.querySelector("textarea");
  if (!textarea) {
    return value;
  }
  textarea.innerHTML = value;
  return textarea.textContent ?? value;
};

const containsHtmlTags = (value: string): boolean =>
  /<\/?[a-z][\s\S]*>/i.test(value);

const markdownEscape = (value: string): string =>
  value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");

const normalizePlainText = (value: string): string =>
  decodeHtmlEntities(value)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeMarkdownDocument = (value: string): string =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeReaderMarkdownLine = (line: string): string =>
  line
    .replace(/^(\s*)\\+(#{1,6}\s+)/, "$1$2")
    .replace(/^(\s*)\\+([-*+]\s+)/, "$1$2")
    .replace(/^(\s*)\\+(\d+\.\s+)/, "$1$2")
    .replace(/^(\s*)\\+(!?\[)/, "$1$2")
    .replace(/\\([[\]()])/g, "$1");

const isNoisyReaderAssetLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.replace(/\\/g, "");
  if (/^!\[\s*]\([^)]*\)\s*$/i.test(normalized)) {
    return true;
  }
  if (/^!\[.*?]\([^)]*\.svg(?:[?#][^)]*)?\)\s*$/i.test(normalized)) {
    return true;
  }
  return /^!?https?:\/\/\S+\.(?:svg|png|jpe?g|webp)(?:[?#]\S*)?$/i.test(
    normalized
  );
};

const stripNoisyReaderMarkdownAssets = (value: string): string =>
  normalizeMarkdownDocument(
    value
      .split("\n")
      .map(normalizeReaderMarkdownLine)
      .filter((line) => {
        return !isNoisyReaderAssetLine(line);
      })
      .join("\n")
  );

const htmlFragmentToMarkdown = (html: string, sourceUrl: URL): string => {
  const { document } = parseHTML(`<article>${html}</article>`);
  const root = document.querySelector("article");
  if (!root) {
    return normalizePlainText(getPlainTextFromHtml(html));
  }

  const blockTags = new Set([
    "ARTICLE",
    "ASIDE",
    "DIV",
    "FIGURE",
    "FOOTER",
    "HEADER",
    "MAIN",
    "NAV",
    "SECTION",
  ]);

  const walk = (node: Node): string => {
    if (node.nodeType === node.TEXT_NODE) {
      return markdownEscape(node.textContent ?? "");
    }
    if (node.nodeType !== node.ELEMENT_NODE) {
      return "";
    }

    const element = node as Element;
    const tagName = element.tagName.toUpperCase();
    const children = Array.from(element.childNodes).map(walk).join("");
    const text = normalizeMarkdownDocument(children);

    if (!text && tagName !== "IMG" && tagName !== "BR") {
      return "";
    }

    if (/^H[1-6]$/.test(tagName)) {
      const level = Number.parseInt(tagName.slice(1), 10);
      return `\n\n${"#".repeat(Math.max(2, level))} ${text}\n\n`;
    }

    switch (tagName) {
      case "A": {
        const href = element.getAttribute("href")?.trim();
        if (!href) {
          return text;
        }
        try {
          const resolved = new URL(href, sourceUrl).toString();
          return `[${text || resolved}](${resolved})`;
        } catch {
          return text;
        }
      }
      case "BLOCKQUOTE":
        return `\n\n${text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      case "BR":
        return "\n";
      case "CODE":
        return `\`${text}\``;
      case "EM":
      case "I":
        return `_${text}_`;
      case "IMG": {
        const src = element.getAttribute("src")?.trim();
        if (!src) {
          return "";
        }
        const alt = element.getAttribute("alt")?.trim() ?? "";
        try {
          return `\n\n![${markdownEscape(alt)}](${new URL(src, sourceUrl).toString()})\n\n`;
        } catch {
          return "";
        }
      }
      case "LI":
        return `\n- ${text}`;
      case "OL":
      case "UL":
        return `\n${text}\n\n`;
      case "P":
        return `\n\n${text}\n\n`;
      case "PRE":
        return `\n\n\`\`\`\n${node.textContent?.trim() ?? ""}\n\`\`\`\n\n`;
      case "STRONG":
      case "B":
        return `**${text}**`;
      default:
        return blockTags.has(tagName) ? `\n\n${text}\n\n` : text;
    }
  };

  return normalizeMarkdownDocument(
    Array.from(root.childNodes).map(walk).join("")
  );
};

const normalizeReaderMarkdown = (value: string, sourceUrl: URL): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return containsHtmlTags(trimmed)
    ? htmlFragmentToMarkdown(trimmed, sourceUrl)
    : normalizeMarkdownDocument(trimmed);
};

const OFFICE_DOCUMENT_EXTENSIONS = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".odb",
  ".odf",
  ".odg",
  ".odm",
  ".odp",
  ".ods",
  ".odt",
  ".otg",
  ".otp",
  ".ots",
  ".ott",
  ".ppt",
  ".pptx",
  ".rtf",
  ".xls",
  ".xlsx",
]);

const getUrlExtension = (url: URL): string => {
  const segment = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const match = segment.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
};

const getTitleFromUrl = (url: URL): string => {
  const segment = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const decoded = (() => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  })();
  return decoded
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
};

const isProbablyLongFormPage = (html: string): boolean => {
  const ogType = (getMetaValue(html, "og:type") ?? "").toLowerCase();
  const articleHint =
    Boolean(getMetaValue(html, "article:published_time")) ||
    Boolean(getMetaValue(html, "article:author")) ||
    Boolean(getMetaValue(html, "author")) ||
    ogType.includes("article");
  if (articleHint) {
    return true;
  }

  const articleTagCount = (html.match(/<article\b/gi) ?? []).length;
  if (articleTagCount > 0) {
    return true;
  }

  const paragraphCount = (html.match(/<p\b/gi) ?? []).length;
  if (paragraphCount >= 6) {
    return true;
  }

  return getWordCount(getPlainTextFromHtml(html)) >= 650;
};

const resolveFaviconUrl = (url: URL, document: Document): string | null => {
  const iconLinks = Array.from(
    document.querySelectorAll("link[rel][href]")
  ).filter((element) => {
    const rel = element.getAttribute("rel")?.toLowerCase() ?? "";
    return (
      rel.includes("icon") ||
      rel.includes("apple-touch-icon") ||
      rel.includes("shortcut")
    );
  });

  for (const link of iconLinks) {
    const href = link.getAttribute("href")?.trim();
    if (!href) {
      continue;
    }

    try {
      const resolved = new URL(href, url);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        return resolved.toString();
      }
    } catch {}
  }

  try {
    return new URL("/favicon.ico", url).toString();
  } catch {
    return null;
  }
};

const extractDefuddleContent = async (
  url: URL,
  html: string
): Promise<{ title: string | null; content: string } | null> => {
  try {
    const extracted = await parseDefuddle(html, url.toString(), {
      markdown: true,
      separateMarkdown: true,
      useAsync: false,
    });
    const content = extracted.contentMarkdown
      ? normalizeMarkdownDocument(extracted.contentMarkdown)
      : normalizeReaderMarkdown(extracted.content ?? "", url);
    const readerContent = stripNoisyReaderMarkdownAssets(content);
    if (!readerContent) {
      return null;
    }

    return {
      title: extracted.title?.trim() || null,
      content: readerContent,
    };
  } catch {
    return null;
  }
};

const extractLightweightReaderMarkdown = (
  url: URL,
  html: string
): string | null => {
  const { document } = parseHTML(html);
  const articleRoot =
    document.querySelector("article") ?? document.querySelector("main");
  const readerMarkdown = articleRoot
    ? stripNoisyReaderMarkdownAssets(
        htmlFragmentToMarkdown(articleRoot.innerHTML, url)
      )
    : "";
  return getWordCount(readerMarkdown) >= 80 ? readerMarkdown : null;
};

const buildOfficeDocumentPreview = (safeUrl: URL): LinkPreview => {
  const title = getTitleFromUrl(safeUrl) || safeUrl.hostname;
  return {
    content: `Document URL: ${safeUrl.toString()}`,
    description: "Linked document queued for the document ingestion pipeline.",
    displayMode: "snapshot",
    favicon: null,
    imageUrl: null,
    kind: "provider",
    mediaUrls: [safeUrl.toString()],
    mode: "provider",
    provider: "office",
    readerMarkdown: null,
    snapshot: {
      capturedAt: new Date().toISOString(),
      contentText: `Document URL: ${safeUrl.toString()}`,
      description:
        "Linked document queued for the document ingestion pipeline.",
      imageUrl: null,
      sourceUrl: safeUrl.toString(),
      title,
    },
    title,
  };
};

const fetchHtmlWithTimeout = async (
  url: string,
  timeoutMs: number
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchHtml(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const extractLightweightLinkPreview = async (
  inputUrl: string
): Promise<LinkPreview> => {
  const safeUrl = assertSafeUrl(inputUrl);
  if (OFFICE_DOCUMENT_EXTENSIONS.has(getUrlExtension(safeUrl))) {
    return buildOfficeDocumentPreview(safeUrl);
  }

  const providerExtraction = await extractFromSupportedProvider(
    safeUrl.toString()
  ).catch(() => null);

  let html: string | null = null;
  let favicon: string | null = null;
  try {
    html = await fetchHtmlWithTimeout(safeUrl.toString(), 1200);
    const { document } = parseHTML(html);
    favicon = resolveFaviconUrl(safeUrl, document);
  } catch {
    html = null;
    favicon = null;
  }

  if (providerExtraction) {
    const imageUrl = html
      ? resolvePreviewImageUrl(getPageImageFromHtml(html), safeUrl)
      : (providerExtraction.mediaUrls[0] ?? null);
    return {
      description: html ? getDescriptionFromHtml(html) : null,
      displayMode: "embed",
      favicon,
      imageUrl,
      kind: "provider",
      mode: "provider",
      title: providerExtraction.title ?? (html ? getTitleFromHtml(html) : null),
      content: providerExtraction.content,
      mediaUrls: providerExtraction.mediaUrls,
      provider: providerExtraction.provider,
      readerMarkdown: null,
      snapshot: null,
    };
  }

  const title =
    (html ? getTitleFromHtml(html) : null) ||
    getTitleFromUrl(safeUrl) ||
    safeUrl.hostname;
  const description = html ? getDescriptionFromHtml(html) : null;
  const imageUrl = html
    ? resolvePreviewImageUrl(getPageImageFromHtml(html), safeUrl)
    : null;
  const readerMarkdown =
    html && isProbablyLongFormPage(html)
      ? extractLightweightReaderMarkdown(safeUrl, html)
      : null;
  const contentText =
    readerMarkdown ??
    (html && getPlainTextFromHtml(html)
      ? getPlainTextFromHtml(html).slice(0, 12_000)
      : `Source URL: ${safeUrl.toString()}`);
  const isArticle =
    Boolean(readerMarkdown) || Boolean(html && isProbablyLongFormPage(html));

  return {
    description,
    displayMode: "snapshot",
    favicon,
    imageUrl,
    kind: isArticle ? "article" : "snapshot",
    mode: "metadata",
    title,
    content: contentText,
    mediaUrls: [],
    readerMarkdown,
    snapshot: {
      capturedAt: new Date().toISOString(),
      contentText: contentText.slice(0, 12_000),
      description,
      imageUrl,
      sourceUrl: safeUrl.toString(),
      title,
    },
  };
};

export const extractLinkPreview = async (
  inputUrl: string
): Promise<LinkPreview> => {
  const safeUrl = assertSafeUrl(inputUrl);
  if (OFFICE_DOCUMENT_EXTENSIONS.has(getUrlExtension(safeUrl))) {
    return buildOfficeDocumentPreview(safeUrl);
  }

  const providerExtraction = await extractFromSupportedProvider(
    safeUrl.toString()
  );
  let html: string | null = null;
  let favicon: string | null = null;

  try {
    html = await fetchHtml(safeUrl.toString());
    const { document } = parseHTML(html);
    favicon = resolveFaviconUrl(safeUrl, document);
  } catch {
    html = null;
    favicon = null;
  }

  if (providerExtraction) {
    return {
      description: html ? getDescriptionFromHtml(html) : null,
      displayMode: "embed",
      favicon,
      imageUrl: html
        ? resolvePreviewImageUrl(getPageImageFromHtml(html), safeUrl)
        : (providerExtraction.mediaUrls[0] ?? null),
      kind: "provider",
      mode: "provider",
      title: providerExtraction.title ?? (html ? getTitleFromHtml(html) : null),
      content: providerExtraction.content,
      mediaUrls: providerExtraction.mediaUrls,
      provider: providerExtraction.provider,
      readerMarkdown: null,
      snapshot: null,
    };
  }

  if (html && isProbablyLongFormPage(html)) {
    const extracted = await extractDefuddleContent(safeUrl, html);
    if (extracted) {
      const title = extracted.title ?? getTitleFromHtml(html);
      const description = getDescriptionFromHtml(html);
      const imageUrl = resolvePreviewImageUrl(
        getPageImageFromHtml(html),
        safeUrl
      );
      return {
        description,
        displayMode: "snapshot",
        favicon,
        imageUrl,
        kind: "article",
        mode: "reader",
        title,
        content: extracted.content,
        mediaUrls: [],
        readerMarkdown: extracted.content,
        snapshot: {
          capturedAt: new Date().toISOString(),
          contentText: extracted.content.slice(0, 12_000),
          description,
          imageUrl,
          sourceUrl: safeUrl.toString(),
          title,
        },
      };
    }
  }

  const fallback = await extractViaTavily(safeUrl.toString());
  const title = fallback.title ?? (html ? getTitleFromHtml(html) : null);
  const description = html ? getDescriptionFromHtml(html) : null;
  const imageUrl = html
    ? resolvePreviewImageUrl(getPageImageFromHtml(html), safeUrl)
    : null;
  const snapshot: LinkSnapshotPreview = {
    capturedAt: new Date().toISOString(),
    contentText: fallback.content.slice(0, 12_000),
    description,
    imageUrl,
    sourceUrl: safeUrl.toString(),
    title,
  };
  return {
    description,
    displayMode: "snapshot",
    favicon,
    imageUrl,
    kind: "snapshot",
    mode: "tavily",
    title,
    content: fallback.content,
    mediaUrls: [],
    readerMarkdown: null,
    snapshot,
  };
};

export const ingestLink = async (
  inputUrl: string
): Promise<CanonicalResource> => {
  const safeUrl = assertSafeUrl(inputUrl);
  const preview = await extractLinkPreview(safeUrl.toString());

  if (preview.mode === "provider") {
    const synthesized = [
      `Provider: ${preview.provider}`,
      `Original URL: ${safeUrl.toString()}`,
      preview.content,
      preview.mediaUrls.length
        ? `Media URLs:\n${preview.mediaUrls.map((value) => `- ${value}`).join("\n")}`
        : "No media URLs extracted.",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      sourceType: "link",
      source: safeUrl.toString(),
      provider: preview.provider,
      title: preview.title ?? undefined,
      metadata: {
        favicon: preview.favicon,
        imageUrl: preview.imageUrl,
        previewDisplayMode: preview.displayMode,
        previewKind: preview.kind,
        mediaUrls: preview.mediaUrls,
        extractionMode: preview.mode,
      },
      chunks: semanticChunkText({
        text: synthesized,
        sourceType: "link",
        source: safeUrl.toString(),
        provider: preview.provider,
        baseMetadata: {
          route: "local-provider-extractor",
          mediaCount: preview.mediaUrls.length,
        },
      }),
    };
  }

  const content = [
    `Source URL: ${safeUrl.toString()}`,
    preview.title ? `Title: ${preview.title}` : "",
    preview.content,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceType: "link",
    source: safeUrl.toString(),
    title: preview.title ?? undefined,
    metadata: {
      favicon: preview.favicon,
      imageUrl: preview.imageUrl,
      previewDisplayMode: preview.displayMode,
      previewKind: preview.kind,
      extractionMode: preview.mode,
      snapshot: preview.snapshot,
    },
    chunks: semanticChunkText({
      text: content,
      sourceType: "link",
      source: safeUrl.toString(),
      baseMetadata: {
        route: preview.mode,
      },
    }),
  };
};
