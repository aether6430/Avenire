import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const initialNodeEnv = process.env.NODE_ENV;

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local"), override: true });

if (initialNodeEnv === undefined) {
  Reflect.deleteProperty(process.env, "NODE_ENV");
} else {
  Reflect.set(process.env, "NODE_ENV", initialNodeEnv);
}

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1"],
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
  serverExternalPackages: [
    "@ai-sdk/baseten",
    "@basetenlabs/performance-client",
    "@better-auth/passkey",
    "@notionhq/client",
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
