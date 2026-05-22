import type { MetadataRoute } from "next";
import { getAllPostMetas } from "@/lib/blog";
import { metadataBase } from "@/lib/page-metadata";

const STATIC_LAST_MODIFIED = "2026-05-20";

const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/roadmap", priority: 0.6, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/waitlist", priority: 0.7, changeFrequency: "monthly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = metadataBase.toString().replace(/\/$/, "");
  const staticEntries = PUBLIC_ROUTES.map((route) => ({
    changeFrequency: route.changeFrequency,
    lastModified: STATIC_LAST_MODIFIED,
    priority: route.priority,
    url: `${base}${route.path === "/" ? "" : route.path}`,
  })) satisfies MetadataRoute.Sitemap;

  const blogEntries = getAllPostMetas().map((post) => ({
    changeFrequency: "monthly" as const,
    lastModified: post.date,
    priority: 0.7,
    url: `${base}/blog/${post.slug}`,
  }));

  return [...staticEntries, ...blogEntries];
}
