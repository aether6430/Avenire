import { MockAgent } from "undici";
import { describe, expect, it } from "vitest";
import {
  assertResolvedRemoteUrlIsSafe,
  assertSafeUrl,
  isUnsafeRemoteAddress,
  safeRemoteFetch,
} from "./safety";

const publicLookup = async () => [
  { address: "93.184.216.34", family: 4 as const },
];

describe("remote ingestion URL safety", () => {
  it("blocks private and reserved literal addresses while allowing public addresses", () => {
    expect(() => assertSafeUrl("https://127.0.0.1/file")).toThrow(
      /Private IPv4/
    );
    expect(() => assertSafeUrl("https://169.254.169.254/latest")).toThrow(
      /Private IPv4/
    );
    expect(() => assertSafeUrl("https://100.64.0.1/file")).toThrow(
      /Private IPv4/
    );
    expect(() => assertSafeUrl("https://[::ffff:127.0.0.1]/file")).toThrow(
      /Private IPv6/
    );
    expect(() => assertSafeUrl("https://[fe80::1]/file")).toThrow(
      /Private IPv6/
    );
    expect(assertSafeUrl("https://172.200.1.1/file").hostname).toBe(
      "172.200.1.1"
    );
  });

  it("classifies unsafe remote addresses through one predicate", () => {
    expect(isUnsafeRemoteAddress("10.0.0.1")).toBe(true);
    expect(isUnsafeRemoteAddress("224.0.0.1")).toBe(true);
    expect(isUnsafeRemoteAddress("::1")).toBe(true);
    expect(isUnsafeRemoteAddress("fc00::1")).toBe(true);
    expect(isUnsafeRemoteAddress("::ffff:192.168.1.1")).toBe(true);
    expect(isUnsafeRemoteAddress("93.184.216.34")).toBe(false);
    expect(isUnsafeRemoteAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(
      false
    );
  });

  it("rejects hostnames with any private resolved address", async () => {
    await expect(
      assertResolvedRemoteUrlIsSafe("https://mixed.example/file", async () => [
        { address: "93.184.216.34", family: 4 as const },
        { address: "127.0.0.1", family: 4 as const },
      ])
    ).rejects.toThrow(/Unsafe DNS address/);
  });

  it("handles redirects manually and blocks unsafe redirect targets", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent
      .get("https://example.com")
      .intercept({ path: "/start", method: "GET" })
      .reply(302, "", { headers: { location: "http://127.0.0.1/private" } });

    await expect(
      safeRemoteFetch("https://example.com/start", {
        dispatcher: agent,
        lookup: publicLookup,
      })
    ).rejects.toThrow(/Private IPv4/);
    await agent.close();
  });

  it("follows bounded safe redirects", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    agent
      .get("https://example.com")
      .intercept({ path: "/start", method: "GET" })
      .reply(302, "", { headers: { location: "/final" } });
    agent
      .get("https://example.com")
      .intercept({ path: "/final", method: "GET" })
      .reply(200, "ok");

    const response = await safeRemoteFetch("https://example.com/start", {
      dispatcher: agent,
      lookup: publicLookup,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    await agent.close();
  });

  it("fails closed when the connection-time lookup selects a private address", async () => {
    await expect(
      safeRemoteFetch("https://rebind.example/file", {
        lookup: async () => [{ address: "127.0.0.1", family: 4 as const }],
      })
    ).rejects.toThrow(/Unsafe DNS address|Unsafe connection address/);
  });
});
