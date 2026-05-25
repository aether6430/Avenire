import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBillingCheckoutFailureUrl,
  resolveBillingAppBaseUrl,
  resolveCheckoutSelection,
  resolvePortalReturnPath,
} from "./billing-route-model";

describe("billing route model", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../polar/webhooks/polar-webhook-route-post");
  });

  it("resolves checkout selections only for paid plans and valid billing periods", () => {
    expect(
      resolveCheckoutSelection(
        new Request(
          "https://avenire.space/api/billing/checkout?plan=core&billing=monthly"
        )
      )
    ).toEqual({
      billing: "monthly",
      plan: "core",
    });

    expect(
      resolveCheckoutSelection(
        new Request(
          "https://avenire.space/api/billing/checkout?plan=free&billing=monthly"
        )
      )
    ).toBeNull();
    expect(
      resolveCheckoutSelection(
        new Request(
          "https://avenire.space/api/billing/checkout?plan=core&billing=weekly"
        )
      )
    ).toBeNull();
  });

  it("resolves billing app base URL and fail-closed portal return paths", () => {
    expect(
      resolveBillingAppBaseUrl(
        new Request("https://billing.avenire.space/api/billing/portal")
      )
    ).toBe("https://billing.avenire.space");

    expect(resolvePortalReturnPath("/workspace?overlay=settings")).toBe(
      "/workspace?overlay=settings"
    );
    expect(resolvePortalReturnPath("https://evil.example")).toBe(
      "/workspace?overlay=settings&settingsTab=billing"
    );
    expect(resolvePortalReturnPath(null)).toBe(
      "/workspace?overlay=settings&settingsTab=billing"
    );
    expect(
      buildBillingCheckoutFailureUrl(
        new Request("https://billing.avenire.space/api/billing/checkout")
      ).toString()
    ).toBe(
      "https://billing.avenire.space/workspace?overlay=settings&settingsTab=billing&error=checkout"
    );
  });

  it("fails closed when the polar webhook wrapper handler throws before returning a response", async () => {
    const handlePolarWebhookRoutePostMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("polar webhook offline"));

    vi.doMock("../polar/webhooks/polar-webhook-route-post", () => ({
      handlePolarWebhookRoutePost: handlePolarWebhookRoutePostMock,
    }));

    const { POST } = await import("../polar/webhooks/route");
    const response = await POST(new Request("http://localhost:3003"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "polar webhook offline",
    });
  });

  it("delegates successful polar webhook requests through the real wrapper", async () => {
    const handlePolarWebhookRoutePostMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true }));

    vi.doMock("../polar/webhooks/polar-webhook-route-post", () => ({
      handlePolarWebhookRoutePost: handlePolarWebhookRoutePostMock,
    }));

    const { POST } = await import("../polar/webhooks/route");
    const request = new Request("http://localhost:3003");
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(handlePolarWebhookRoutePostMock).toHaveBeenCalledWith({
      request,
    });
  });
});
