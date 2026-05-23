import { describe, expect, it } from "vitest";
import { parseOriginList, resolveTrustedOrigins } from "./origin-policy";
import { isPasskeyOriginSupported } from "./passkey-origin";

describe("@avenire/auth origin and passkey policy", () => {
  it("parses trusted-origin environment lists by trimming values and dropping empties", () => {
    expect(
      parseOriginList(
        " https://app.avenire.test , , chrome-extension://abc123 , "
      )
    ).toEqual(["https://app.avenire.test", "chrome-extension://abc123"]);
    expect(parseOriginList(undefined)).toEqual([]);
  });

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
    expect(
      resolveTrustedOrigins({
        appUrl: "http://localhost:3000",
        trustedOriginsFromEnv: [],
        extensionOriginsFromEnv: [],
        nodeEnv: "production",
        requestOrigin: "http://127.0.0.1:3000",
      })
    ).toContain("http://127.0.0.1:3000");
    expect(
      resolveTrustedOrigins({
        appUrl: "http://localhost:3000",
        trustedOriginsFromEnv: [],
        extensionOriginsFromEnv: [],
        nodeEnv: "production",
        requestOrigin: "http://127.0.0.1:3001",
      })
    ).not.toContain("http://127.0.0.1:3001");
    expect(
      resolveTrustedOrigins({
        appUrl: "http://localhost:3000",
        trustedOriginsFromEnv: ["http://localhost:3000"],
        extensionOriginsFromEnv: ["chrome-extension://abc123"],
        nodeEnv: "development",
        requestOrigin: "not an origin",
      })
    ).toEqual(["http://localhost:3000", "chrome-extension://abc123"]);
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
      supports("LOCALHOST", "HTTP:"),
      supports("Avenire.Space", "HTTPS:"),
    ]).toEqual([true, true, true, false, false, true, true]);
  });
});
