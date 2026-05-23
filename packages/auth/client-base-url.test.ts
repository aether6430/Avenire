import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthClientBaseURL } from "./client-base-url";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("resolveAuthClientBaseURL", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    vi.unstubAllGlobals();
  });

  it("uses the configured app URL when no browser origin is available", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.avenire.test";

    expect(resolveAuthClientBaseURL()).toBe("https://app.avenire.test");
  });

  it("keeps local auth calls on the current localhost alias", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    vi.stubGlobal("window", {
      location: { origin: "http://127.0.0.1:3000" },
    });

    expect(resolveAuthClientBaseURL()).toBe("http://127.0.0.1:3000");
  });

  it("does not rewrite non-local configured app URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.avenire.test";
    vi.stubGlobal("window", {
      location: { origin: "https://preview.avenire.test" },
    });

    expect(resolveAuthClientBaseURL()).toBe("https://app.avenire.test");
  });

  it("fails closed to the configured value when the app URL is malformed", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not a valid url";
    vi.stubGlobal("window", {
      location: { origin: "http://127.0.0.1:3000" },
    });

    expect(resolveAuthClientBaseURL()).toBe("not a valid url");
  });
});
