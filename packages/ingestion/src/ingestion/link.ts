import Defuddle from "defuddle";
import { createMarkdownContent } from "defuddle/full";
import { parseHTML } from "linkedom";
import { tavily } from "@tavily/core";
import { config } from "../config";
import { assertSafeUrl } from "../utils/safety";
import { semanticChunkText } from "./chunking";
import { extractFromSupportedProvider } from "./provider-extractors";
import type { CanonicalResource } from "./types";

type LinkExtractionMode = "provider" | "defuddle" | "tavily";

export type LinkPreview = {
  favicon: string | null;
  mode: LinkExtractionMode;
  title: string | null;
  content: string;
  provider?: string;
  mediaUrls: string[];
};

const extractViaTavily = async (
  url: string,
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
  const content = (item.rawContent ?? item.raw_content ?? item.content ?? "").trim();
  if (!content) {
    throw new Error(`Tavily returned empty content for ${url}`);
  }

  return {
    title: item.title ?? payload.title ?? null,
    content,
  };
};

const fetchHtml = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const escapeForPattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMetaValue = (html: string, property: string): string | null => {
  const escaped = escapeForPattern(property);
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
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

const getPlainTextFromHtml = (html: string): string => {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&"),
  );
};

const getWordCount = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).filter(Boolean).length;
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

const resolveFaviconUrl = (
  url: URL,
  document: Document,
): string | null => {
  const iconLinks = Array.from(
    document.querySelectorAll("link[rel][href]"),
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
    } catch {
      continue;
    }
  }

  try {
    return new URL("/favicon.ico", url).toString();
  } catch {
    return null;
  }
};

const extractDefuddleContent = async (
  url: URL,
  html: string,
): Promise<{ title: string | null; content: string } | null> => {
  try {
    const { document } = parseHTML(html);
    const defuddle = new Defuddle(document, {
      url: url.toString(),
      useAsync: false,
    });
    const extracted = defuddle.parse();
    const content = createMarkdownContent(extracted.content, url.toString()).trim();
    if (!content) {
      return null;
    }

    return {
      title: extracted.title?.trim() || null,
      content,
    };
  } catch {
    return null;
  }
};

export const extractLinkPreview = async (inputUrl: string): Promise<LinkPreview> => {
  const safeUrl = assertSafeUrl(inputUrl);
  const providerExtraction = await extractFromSupportedProvider(safeUrl.toString());
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
      favicon,
      mode: "provider",
      title: providerExtraction.title ?? (html ? getTitleFromHtml(html) : null),
      content: providerExtraction.content,
      mediaUrls: providerExtraction.mediaUrls,
      provider: providerExtraction.provider,
    };
  }

  if (html && isProbablyLongFormPage(html)) {
    const extracted = await extractDefuddleContent(safeUrl, html);
    if (extracted) {
      return {
        favicon,
        mode: "defuddle",
        title: extracted.title ?? getTitleFromHtml(html),
        content: extracted.content,
        mediaUrls: [],
      };
    }
  }

  const fallback = await extractViaTavily(safeUrl.toString());
  return {
    favicon,
    mode: "tavily",
    title: fallback.title ?? (html ? getTitleFromHtml(html) : null),
    content: fallback.content,
    mediaUrls: [],
  };
};

export const ingestLink = async (inputUrl: string): Promise<CanonicalResource> => {
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
      extractionMode: preview.mode,
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
