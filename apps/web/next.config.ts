import { resolve } from "node:path";
import { loadDatabaseEnv } from "@avenire/database/load-env";
import type { NextConfig } from "next";

loadDatabaseEnv({
  packageRootDir: resolve(process.cwd(), "../../packages/database"),
});

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: resolve(process.cwd(), "../../"),
  outputFileTracingExcludes: {
    "/*": [
      "../../apps/backend/node_modules/**/*",
      "../../apps/emails/node_modules/**/*",
      "../../apps/extension/node_modules/**/*",
      "../../.ccb/**/*",
      "../../.git/**/*",
      "../../.turbo/**/*",
      "../../docs/**/*",
      "../../logs/**/*",
      "../../output/**/*",
      "../../packages/*/node_modules/**/*",
    ],
  },
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
  transpilePackages: ["@avenire/ai", "@avenire/database"],
  serverExternalPackages: [
    "@ai-sdk/baseten",
    "@better-auth/passkey",
    "@notionhq/client",
    "@avenire/auth",
    "@avenire/storage",
    "@avenire/emailer",
    "@avenire/ingestion",
    "@avenire/payments",
    "@basetenlabs/performance-client",
    "@polar-sh/better-auth",
    "better-auth",
    "defuddle",
    "gray-matter",
    "reading-time",
    "uploadthing",
  ],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
