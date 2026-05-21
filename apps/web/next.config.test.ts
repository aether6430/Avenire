import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("allows local browser audits through 127.0.0.1 in development", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });
});
