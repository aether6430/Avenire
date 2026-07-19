import { Defuddle } from "defuddle/node";
import { Firecrawl } from "firecrawl";
import { z } from "zod";
import { config } from "../config";
import { assertSafeUrl } from "../utils/safety";
import { semanticChunkText } from "./chunking";
import { extractFromSupportedProvider } from "./provider-extractors";
import type { CanonicalResource } from "./types";

export type LinkExtractionMode = "firecrawl" | "provider";
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

const FirecrawlDocumentSchema = z.object({
  html: z.string().optional(),
  metadata: z
    .object({
      description: z.string().optional(),
      favicon: z.string().optional(),
      ogImage: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  screenshot: z.string().optional(),
  summary: z.string().optional(),
});

const StoredLinkPreviewSchema = z.object({
  content: z.string(),
  description: z.string().nullable(),
  displayMode: z.enum(["embed", "reader", "snapshot"]),
  extractionMode: z.enum(["firecrawl", "provider"]),
  favicon: z.string().nullable(),
  imageUrl: z.string().nullable(),
  kind: z.enum(["article", "provider", "snapshot"]),
  mediaUrls: z.array(z.string()),
  provider: z.string().nullable().optional(),
  readerMarkdown: z.string().nullable(),
  snapshot: z
    .object({
      capturedAt: z.string(),
      contentText: z.string(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
      sourceUrl: z.string(),
      title: z.string().nullable(),
    })
    .nullable(),
  title: z.string().nullable(),
});

const normalizeOptionalString = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const getFirecrawlClient = (): Firecrawl => {
  if (!config.firecrawlApiKey) {
    throw new Error("FIRECRAWL_API_KEY is required for link extraction.");
  }

  return new Firecrawl({
    apiKey: config.firecrawlApiKey,
    ...(config.firecrawlApiUrl ? { apiUrl: config.firecrawlApiUrl } : {}),
  });
};

const extractViaFirecrawl = async (url: string) => {
  const response = await getFirecrawlClient().scrape(url, {
    blockAds: true,
    formats: [
      "html",
      "summary",
      {
        type: "screenshot",
        fullPage: true,
        quality: 82,
        viewport: { height: 900, width: 1440 },
      },
    ],
    onlyMainContent: false,
    removeBase64Images: true,
  });
  const parsed = FirecrawlDocumentSchema.parse(response);
  const html = normalizeOptionalString(parsed.html);
  if (!html) {
    throw new Error(`Firecrawl returned empty HTML for ${url}`);
  }

  const defuddled = await Defuddle(html, url, {
    markdown: true,
    useAsync: false,
  });
  const markdown = normalizeOptionalString(defuddled.content);
  if (!markdown) {
    throw new Error(`Defuddle returned empty Markdown for ${url}`);
  }

  return {
    description:
      normalizeOptionalString(defuddled.description) ??
      normalizeOptionalString(parsed.summary) ??
      normalizeOptionalString(parsed.metadata?.description),
    favicon:
      normalizeOptionalString(defuddled.favicon) ??
      normalizeOptionalString(parsed.metadata?.favicon),
    markdown,
    pageImageUrl:
      normalizeOptionalString(defuddled.image) ??
      normalizeOptionalString(parsed.metadata?.ogImage),
    screenshotUrl: normalizeOptionalString(parsed.screenshot),
    title:
      normalizeOptionalString(defuddled.title) ??
      normalizeOptionalString(parsed.metadata?.title),
  };
};

export const linkPreviewFromMetadata = (value: unknown): LinkPreview | null => {
  const parsed = StoredLinkPreviewSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    content: parsed.data.content,
    description: parsed.data.description,
    displayMode: parsed.data.displayMode,
    favicon: parsed.data.favicon,
    imageUrl: parsed.data.imageUrl,
    kind: parsed.data.kind,
    mediaUrls: parsed.data.mediaUrls,
    mode: parsed.data.extractionMode,
    ...(parsed.data.provider ? { provider: parsed.data.provider } : {}),
    readerMarkdown: parsed.data.readerMarkdown,
    snapshot: parsed.data.snapshot,
    title: parsed.data.title,
  };
};

export const extractLinkPreview = async (
  inputUrl: string
): Promise<LinkPreview> => {
  const safeUrl = assertSafeUrl(inputUrl);
  const sourceUrl = safeUrl.toString();
  const [firecrawl, providerExtraction] = await Promise.all([
    extractViaFirecrawl(sourceUrl),
    extractFromSupportedProvider(sourceUrl),
  ]);
  const capturedAt = new Date().toISOString();
  const previewImageUrl = firecrawl.screenshotUrl ?? firecrawl.pageImageUrl;
  const title = providerExtraction?.title ?? firecrawl.title;
  const content = providerExtraction?.content ?? firecrawl.markdown;
  const kind: LinkPreviewKind = providerExtraction ? "provider" : "article";

  return {
    content,
    description: firecrawl.description,
    displayMode: providerExtraction ? "embed" : "snapshot",
    favicon: firecrawl.favicon,
    imageUrl: previewImageUrl,
    kind,
    mediaUrls: providerExtraction?.mediaUrls ?? [],
    mode: providerExtraction ? "provider" : "firecrawl",
    provider: providerExtraction?.provider ?? "firecrawl",
    readerMarkdown: firecrawl.markdown,
    snapshot: {
      capturedAt,
      contentText: firecrawl.markdown.slice(0, 12_000),
      description: firecrawl.description,
      imageUrl: previewImageUrl,
      sourceUrl,
      title,
    },
    title,
  };
};

export const ingestLink = async (
  inputUrl: string,
  storedPreview?: LinkPreview | null
): Promise<CanonicalResource> => {
  const safeUrl = assertSafeUrl(inputUrl);
  const sourceUrl = safeUrl.toString();
  const preview = storedPreview ?? (await extractLinkPreview(sourceUrl));
  const provider = preview.provider;
  const content = [
    `Source URL: ${sourceUrl}`,
    preview.title ? `Title: ${preview.title}` : "",
    preview.description ? `Summary: ${preview.description}` : "",
    preview.content,
    preview.mediaUrls.length > 0
      ? `Media URLs:\n${preview.mediaUrls.map((value) => `- ${value}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceType: "link",
    source: sourceUrl,
    ...(provider ? { provider } : {}),
    ...(preview.title ? { title: preview.title } : {}),
    metadata: {
      extractionMode: preview.mode,
      favicon: preview.favicon,
      imageUrl: preview.imageUrl,
      mediaUrls: preview.mediaUrls,
      previewDisplayMode: preview.displayMode,
      previewKind: preview.kind,
      readerMarkdown: preview.readerMarkdown,
      snapshot: preview.snapshot,
    },
    chunks: semanticChunkText({
      text: content,
      sourceType: "link",
      source: sourceUrl,
      ...(provider ? { provider } : {}),
      baseMetadata: {
        mediaCount: preview.mediaUrls.length,
        route: preview.mode,
      },
    }),
  };
};
