import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/blog";
import { metadataBase } from "@/lib/page-metadata";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/blog",
  "/pricing",
  "/privacy",
  "/roadmap",
  "/terms",
  "/waitlist",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = metadataBase.toString().replace(/\/$/, "");
  const staticEntries = PUBLIC_ROUTES.map((route) => ({
    changeFrequency: route === "/" ? "weekly" : "monthly",
    lastModified: now,
    priority: route === "/" ? 1 : route === "/pricing" || route === "/blog" ? 0.8 : 0.6,
    url: `${base}${route === "/" ? "" : route}`,
  })) satisfies MetadataRoute.Sitemap;

  const blogEntries = getAllSlugs().map((slug) => ({
    changeFrequency: "monthly" as const,
    lastModified: now,
    priority: 0.7,
    url: `${base}/blog/${slug}`,
  }));

  return [...staticEntries, ...blogEntries];
}
