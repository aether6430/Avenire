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
  title: string;
}): Metadata {
  const title = `${input.title} — Avenire`;
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const ogImage = new URL("/api/og", metadataBase);
  ogImage.searchParams.set("title", input.title);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [ogImage.toString()],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.toString()],
    },
  };
}
