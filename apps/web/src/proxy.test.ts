import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasSessionCookieMock } = vi.hoisted(() => ({
  hasSessionCookieMock: vi.fn(),
}));

vi.mock("@avenire/auth/middleware", () => ({
  hasSessionCookie: hasSessionCookieMock,
}));

import { proxy } from "./proxy";

const makeRequest = (pathname: string) =>
  new NextRequest(`http://localhost:3003${pathname}`);

describe("proxy route gating", () => {
  beforeEach(() => {
    hasSessionCookieMock.mockReset();
  });

  it("lets uploadthing requests pass through without checking auth", async () => {
    const response = await proxy(makeRequest("/api/uploadthing"));

    expect(hasSessionCookieMock).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects anonymous visitors away from protected routes", async () => {
    hasSessionCookieMock.mockReturnValue(false);

    const response = await proxy(makeRequest("/workspace"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3003/login"
    );
  });

  it("redirects signed-in users away from auth screens", async () => {
    hasSessionCookieMock.mockReturnValue(true);

    const response = await proxy(makeRequest("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3003/workspace"
    );
  });

  it("allows public screens for signed-out visitors", async () => {
    hasSessionCookieMock.mockReturnValue(false);

    const response = await proxy(makeRequest("/register"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
