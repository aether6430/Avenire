import type { Metadata } from "next";

const DEFAULT_DESCRIPTION =
  "An interactive AI reasoning and research workspace. Break down complex ideas, learn interactively, and build genuine understanding.";

const DEFAULT_SITE_URL = "https://avenire.space";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.BETTER_AUTH_URL?.trim() ||
  DEFAULT_SITE_URL;

export const metadataBase = new URL(configuredSiteUrl);

export function buildPageMetadata(input: {
  description?: string;
  noIndex?: boolean;
  path?: string;
  title: string;
}): Metadata {
  const title = `${input.title} — Avenire`;
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const ogImage = new URL("/api/og", metadataBase);
  ogImage.searchParams.set("template", "home");
  const ogImageUrl = ogImage.toString();
  const canonical =
    input.path === undefined
      ? undefined
      : new URL(
          input.path === "/" ? "/" : input.path.replace(/\/+$/, ""),
          metadataBase
        ).toString();

  return {
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: `${input.title} — Avenire`,
        },
      ],
    },
    robots: input.noIndex
      ? {
          follow: false,
          index: false,
        }
      : undefined,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          alt: `${input.title} — Avenire`,
        },
      ],
    },
  };
}
