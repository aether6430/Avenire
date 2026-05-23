import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBillingPortalUrl,
  loadBillingUsage,
  loadProviderBillingPlan,
  openProviderBillingPortal,
  startProviderCheckout,
} from "@/components/settings/settings-billing-client";
import { DEFAULT_SETTINGS_BILLING_RETURN_PATH } from "@/lib/settings-overlay-route";

const polarRouteSource = readFileSync(
  resolve(import.meta.dirname, "../../app/api/billing/polar/route.ts"),
  "utf8"
);
const settingsBillingClientSource = readFileSync(
  resolve(import.meta.dirname, "settings-billing-client.ts"),
  "utf8"
);

const { checkoutMock, customerPortalMock, customerStateMock } = vi.hoisted(
  () => ({
    checkoutMock: vi.fn(),
    customerPortalMock: vi.fn(),
    customerStateMock: vi.fn(),
  })
);

vi.mock("@avenire/auth/client", () => ({
  authClient: {
    checkout: checkoutMock,
    customer: {
      portal: customerPortalMock,
      state: customerStateMock,
    },
  },
}));

describe("settings billing client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    checkoutMock.mockReset();
    customerPortalMock.mockReset();
    customerStateMock.mockReset();
  });

  it("loads billing usage through the dedicated transport route and reconciles provider billing state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          usage: {
            plan: "core",
            chat: {
              totalBalance: 1200,
              totalCapacity: 2000,
              refillAt: "2026-05-20T00:00:00.000Z",
            },
            storage: {
              limitBytes: 4096,
              remainingBytes: 2048,
              usedBytes: 2048,
            },
            combined: {
              totalBalance: 1200,
              totalCapacity: 2000,
            },
          },
        }),
        { status: 200 }
      )
    );
    customerStateMock.mockResolvedValue({
      data: {
        activeSubscriptions: [
          {
            metadata: { plan: "scholar" },
            status: "active",
          },
        ],
      },
    });

    await expect(loadBillingUsage()).resolves.toEqual({
      plan: "scholar",
      chat: {
        totalBalance: 1200,
        totalCapacity: 2000,
        refillAt: "2026-05-20T00:00:00.000Z",
      },
      storage: {
        limitBytes: 4096,
        remainingBytes: 2048,
        usedBytes: 2048,
      },
      combined: {
        totalBalance: 1200,
        totalCapacity: 2000,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/usage", {
      cache: "no-store",
    });
  });

  it("falls back to the server billing route when the Better Auth provider state lookup fails", async () => {
    const usage = {
      plan: "core",
      chat: {
        totalBalance: 1200,
        totalCapacity: 2000,
        refillAt: "2026-05-20T00:00:00.000Z",
      },
      storage: {
        limitBytes: 4096,
        remainingBytes: 2048,
        usedBytes: 2048,
      },
      combined: {
        totalBalance: 1200,
        totalCapacity: 2000,
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ usage }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ plan: "scholar" }), { status: 200 })
      );
    customerStateMock.mockRejectedValue(
      new Error("Provider state unavailable")
    );

    await expect(loadBillingUsage()).resolves.toEqual({
      ...usage,
      plan: "scholar",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/billing/polar", {
      cache: "no-store",
      method: "POST",
    });
  });

  it("keeps the transport billing usage when both provider-state lookups fail", async () => {
    const usage = {
      plan: "core",
      chat: {
        totalBalance: 1200,
        totalCapacity: 2000,
        refillAt: "2026-05-20T00:00:00.000Z",
      },
      storage: {
        limitBytes: 4096,
        remainingBytes: 2048,
        usedBytes: 2048,
      },
      combined: {
        totalBalance: 1200,
        totalCapacity: 2000,
      },
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ usage }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Polar offline" }), {
          status: 503,
        })
      );
    customerStateMock.mockRejectedValue(
      new Error("Provider state unavailable")
    );

    await expect(loadBillingUsage()).resolves.toEqual(usage);
  });

  it("derives a provider plan from Better Auth Polar customer state", async () => {
    customerStateMock.mockResolvedValueOnce({
      data: {
        activeSubscriptions: [
          {
            metadata: { plan: "core" },
            status: "active",
          },
        ],
      },
    });
    customerStateMock.mockResolvedValueOnce({
      data: {
        activeSubscriptions: [
          {
            amount: 4900,
            status: "active",
          },
        ],
      },
    });
    customerStateMock.mockResolvedValueOnce({
      data: {
        activeSubscriptions: [
          {
            amount: 5500,
            status: "trialing",
          },
        ],
      },
    });
    customerStateMock.mockResolvedValueOnce({
      data: {
        activeSubscriptions: [],
      },
    });

    await expect(loadProviderBillingPlan()).resolves.toBe("core");
    await expect(loadProviderBillingPlan()).resolves.toBe("core");
    await expect(loadProviderBillingPlan()).resolves.toBe("scholar");
    await expect(loadProviderBillingPlan()).resolves.toBe("access");
  });

  it("falls back to the server billing route when the client subscription needs product-id plan mapping", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ plan: "core" }), { status: 200 })
      );
    customerStateMock.mockResolvedValue({
      data: {
        activeSubscriptions: [
          {
            amount: 9900,
            productId: "product-core-yearly",
            status: "active",
          },
        ],
      },
    });

    await expect(loadProviderBillingPlan()).resolves.toBe("core");
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/polar", {
      cache: "no-store",
      method: "POST",
    });
  });

  it("loads billing portal urls and surfaces API errors explicitly", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ url: "https://billing.example.com/portal" }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Portal unavailable." }), {
          status: 503,
        })
      );

    await expect(
      loadBillingPortalUrl(DEFAULT_SETTINGS_BILLING_RETURN_PATH)
    ).resolves.toBe("https://billing.example.com/portal");
    await expect(
      loadBillingPortalUrl(DEFAULT_SETTINGS_BILLING_RETURN_PATH)
    ).rejects.toThrow("Portal unavailable.");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/billing/portal",
      expect.objectContaining({
        body: JSON.stringify({
          returnPath: DEFAULT_SETTINGS_BILLING_RETURN_PATH,
        }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/billing/portal",
      expect.objectContaining({
        body: JSON.stringify({
          returnPath: DEFAULT_SETTINGS_BILLING_RETURN_PATH,
        }),
        method: "POST",
      })
    );
  });

  it("fails closed when the billing portal route responds without a url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await expect(
      loadBillingPortalUrl(DEFAULT_SETTINGS_BILLING_RETURN_PATH)
    ).rejects.toThrow("Unable to open billing portal.");
  });

  it("delegates paid-plan portal and checkout actions to the Better Auth Polar client", async () => {
    customerPortalMock.mockResolvedValue(undefined);
    checkoutMock.mockResolvedValue(undefined);

    await expect(openProviderBillingPortal()).resolves.toBeUndefined();
    await expect(startProviderCheckout("core")).resolves.toBeUndefined();
    await expect(startProviderCheckout("scholar")).resolves.toBeUndefined();

    expect(customerPortalMock).toHaveBeenCalledTimes(1);
    expect(checkoutMock).toHaveBeenNthCalledWith(1, {
      slug: "core-monthly",
    });
    expect(checkoutMock).toHaveBeenNthCalledWith(2, {
      slug: "scholar-monthly",
    });
  });

  it("keeps the server billing fallback route aligned to the client recovery path", () => {
    expect(settingsBillingClientSource).toContain(
      "return plan ?? loadServerBillingPlan();"
    );
    expect(settingsBillingClientSource).toContain(
      "if (subscription.productId)"
    );
    expect(polarRouteSource).toContain('route: "/api/billing/polar"');
    expect(polarRouteSource).toContain(
      "mapProductIdToPlan(subscription.productId)"
    );
    expect(polarRouteSource).toContain("plan: resolvePolarRoutePlan");
    expect(polarRouteSource).toContain("Unable to prepare Polar customer");
  });
});
