import { assertSafeUrl } from "../utils/safety";

export interface ProviderExtracted {
  content: string;
  mediaUrls: string[];
  provider: "instagram" | "pinterest" | "reddit" | "twitter" | "youtube";
  title?: string;
}

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
};

const getOgValue = (html: string, property: string): string | null => {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
};

const isSocialHost = (host: string, values: string[]): boolean => {
  return values.some((value) => host === value || host.endsWith(`.${value}`));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> | null => {
  const nested = value[key];
  return isRecord(nested) ? nested : null;
};

const getString = (
  value: Record<string, unknown>,
  key: string
): string | undefined => {
  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
};

const extractYouTube = async (url: URL): Promise<ProviderExtracted> => {
  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("url", url.toString());
  oembedUrl.searchParams.set("format", "json");

  const response = await fetch(oembedUrl);
  const json = (await response.json().catch(() => ({}))) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  const content = [
    `YouTube URL: ${url.toString()}`,
    json.title ? `Title: ${json.title}` : "",
    json.author_name ? `Channel: ${json.author_name}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    provider: "youtube",
    title: json.title,
    content,
    mediaUrls: json.thumbnail_url ? [json.thumbnail_url] : [],
  };
};

const extractPinterest = async (url: URL): Promise<ProviderExtracted> => {
  const html = await fetchText(url.toString());
  const videoRegex = /"url":"(https:[^"]*pinimg[^"]*)"/g;
  const imageRegex = /src="(https:\/\/i\.pinimg\.com\/.*?\.(jpg|gif|png))"/g;

  const mediaUrls = [
    ...Array.from(html.matchAll(videoRegex)).map((match) =>
      match[1]?.replaceAll("\\/", "/")
    ),
    ...Array.from(html.matchAll(imageRegex)).map((match) => match[1]),
  ].filter((value): value is string => Boolean(value));

  return {
    provider: "pinterest",
    content: `Pinterest URL: ${url.toString()}\nMedia found: ${mediaUrls.length}`,
    mediaUrls,
  };
};

const getFirstRecord = (value: unknown): Record<string, unknown> | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = value[0];
  return isRecord(first) ? first : null;
};

const extractRedditPost = (
  payload: unknown
): Record<string, unknown> | null => {
  const listing = getFirstRecord(payload);
  if (!listing) {
    return null;
  }

  const listingData = getRecord(listing, "data");
  const children = listingData?.children;
  const child = getFirstRecord(children);
  if (!child) {
    return null;
  }

  return getRecord(child, "data");
};

const extractRedditVideoFallback = (
  post: Record<string, unknown>
): string | undefined => {
  const secureMedia = getRecord(post, "secure_media");
  const redditVideo = secureMedia
    ? getRecord(secureMedia, "reddit_video")
    : null;
  return redditVideo ? getString(redditVideo, "fallback_url") : undefined;
};

const extractReddit = async (url: URL): Promise<ProviderExtracted> => {
  const pathname = url.pathname.replace(/\/$/, "");
  const jsonUrl = pathname.endsWith(".json")
    ? new URL(url.toString())
    : new URL(`${url.origin}${pathname}.json`);

  const response = await fetch(jsonUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      accept: "application/json",
    },
  });

  const payload: unknown = await response.json().catch(() => null);
  const post = extractRedditPost(payload);
  const title = post ? getString(post, "title") : undefined;
  const selftext = post ? getString(post, "selftext") : undefined;

  const mediaUrls: string[] = [];
  const destinationUrl = post
    ? getString(post, "url_overridden_by_dest")
    : undefined;
  if (destinationUrl) {
    mediaUrls.push(destinationUrl);
  }
  const postUrl = post ? getString(post, "url") : undefined;
  if (postUrl) {
    mediaUrls.push(postUrl);
  }
  const videoUrl = post ? extractRedditVideoFallback(post) : undefined;
  if (videoUrl) {
    mediaUrls.push(videoUrl);
  }

  return {
    provider: "reddit",
    title,
    content: [
      `Reddit URL: ${url.toString()}`,
      title ? `Title: ${title}` : "",
      selftext ? `Body: ${selftext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    mediaUrls,
  };
};

const extractFromOgTags = async (
  provider: ProviderExtracted["provider"],
  url: URL
): Promise<ProviderExtracted> => {
  const html = await fetchText(url.toString());

  const mediaUrls = [
    getOgValue(html, "og:video"),
    getOgValue(html, "og:video:url"),
    getOgValue(html, "og:image"),
  ].filter((value): value is string => Boolean(value));

  return {
    provider,
    title: getOgValue(html, "og:title") ?? undefined,
    content: [
      `${provider.toUpperCase()} URL: ${url.toString()}`,
      getOgValue(html, "og:title")
        ? `Title: ${getOgValue(html, "og:title")}`
        : "",
      getOgValue(html, "og:description")
        ? `Description: ${getOgValue(html, "og:description")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    mediaUrls,
  };
};

export const extractFromSupportedProvider = async (
  inputUrl: string
): Promise<ProviderExtracted | null> => {
  const url = assertSafeUrl(inputUrl);
  const host = url.hostname.toLowerCase();

  if (isSocialHost(host, ["youtube.com", "youtu.be", "m.youtube.com"])) {
    return extractYouTube(url);
  }

  if (isSocialHost(host, ["pinterest.com", "pin.it"])) {
    return extractPinterest(url);
  }

  if (isSocialHost(host, ["reddit.com", "redd.it"])) {
    return extractReddit(url);
  }

  if (isSocialHost(host, ["x.com", "twitter.com"])) {
    return extractFromOgTags("twitter", url);
  }

  if (isSocialHost(host, ["instagram.com"])) {
    return extractFromOgTags("instagram", url);
  }

  return null;
};
