import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Allow .mdx extensions for files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gtgr46laft.ufs.sh",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
    ],
  },
  serverExternalPackages: [
    "@ai-sdk/baseten",
    "@basetenlabs/performance-client",
  ],
  transpilePackages: [
    "@avenire/ui",
    "@avenire/auth",
    "@avenire/ai",
    "@avenire/storage",
    "@avenire/payments",
    "@avenire/database",
    "@avenire/emailer",
    "@avenire/ingestion",
  ],
  productionBrowserSourceMaps: true,
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired.
  // With Turbopack, plugins must be specified as strings (no function references).
  // See: https://nextjs.org/docs/app/guides/mdx#using-plugins-with-turbopack
  options: {
    remarkPlugins: [
      // Parse YAML frontmatter so MDX doesn't choke on `---` blocks
      "remark-frontmatter",
      // Extract frontmatter into a named export for MDX modules
      ["remark-mdx-frontmatter", { name: "frontmatter" }],
      // GitHub Flavored Markdown (tables, strikethrough, etc.)
      "remark-gfm",
      // Math syntax support (dollar-sign delimiters)
      "remark-math",
    ],
    rehypePlugins: [
      // KaTeX for rendering math expressions
      [
        "rehype-katex",
        { strict: true, throwOnError: false, output: "html" },
      ],
    ],
  },
});

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
