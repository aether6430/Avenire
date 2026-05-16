import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "./origin-policy";
import { isPasskeyOriginSupported } from "./passkey-origin";

describe("@avenire/auth origin and passkey policy", () => {
  it("admits only the intended development origins", () => {
    const devOrigins = (requestOrigin: string) =>
      resolveTrustedOrigins({
        appUrl: "http://localhost:3003",
        trustedOriginsFromEnv: [],
        extensionOriginsFromEnv: [],
        nodeEnv: "development",
        requestOrigin,
      });

    expect(devOrigins("http://localhost:3004")).toContain(
      "http://localhost:3004"
    );
    expect(devOrigins("chrome-extension://extension-id")).toContain(
      "chrome-extension://extension-id"
    );
    expect(devOrigins("https://evil.example")).not.toContain(
      "https://evil.example"
    );
    expect(
      resolveTrustedOrigins({
        appUrl: "https://avenire.app",
        trustedOriginsFromEnv: ["https://avenire.app"],
        extensionOriginsFromEnv: [],
        nodeEnv: "production",
        requestOrigin: "http://localhost:3004",
      })
    ).not.toContain("http://localhost:3004");
  });

  it("allows secure and localhost passkey origins while failing closed on loopback ip http", () => {
    const supports = (hostname: string, protocol: string) =>
      isPasskeyOriginSupported({ hostname, protocol });

    expect([
      supports("avenire.space", "https:"),
      supports("localhost", "http:"),
      supports("app.localhost", "http:"),
      supports("127.0.0.1", "http:"),
      supports("::1", "http:"),
    ]).toEqual([true, true, true, false, false]);
  });
});
