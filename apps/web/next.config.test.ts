import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("does not let .env.local overwrite the process NODE_ENV at import time", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });

  it("allows local browser audits through 127.0.0.1 in development", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });

  it("transpiles the full set of internal workspace packages used by the app shell", () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining([
        "@avenire/ui",
        "@avenire/auth",
        "@avenire/ai",
        "@avenire/storage",
        "@avenire/payments",
        "@avenire/database",
        "@avenire/emailer",
        "@avenire/ingestion",
      ])
    );
  });

  it("does not keep transpiled internal workspace packages marked as server externals", () => {
    expect(nextConfig.serverExternalPackages).not.toEqual(
      expect.arrayContaining([
        "@avenire/auth",
        "@avenire/storage",
        "@avenire/payments",
        "@avenire/emailer",
        "@avenire/ingestion",
      ])
    );
  });
});
