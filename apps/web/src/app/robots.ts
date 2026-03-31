import type { MetadataRoute } from "next";
import { metadataBase } from "@/lib/page-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    host: metadataBase.toString(),
    rules: [
      {
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/share/",
          "/workspace/",
        ],
        userAgent: "*",
      },
    ],
    sitemap: `${metadataBase.toString().replace(/\/$/, "")}/sitemap.xml`,
  };
}
