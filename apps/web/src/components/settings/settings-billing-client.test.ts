import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBillingPortalUrl,
  loadBillingUsage,
} from "@/components/settings/settings-billing-client";
import { DEFAULT_SETTINGS_BILLING_RETURN_PATH } from "@/lib/settings-overlay-route";

describe("settings billing client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads billing usage through the dedicated transport route", async () => {
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
            upload: {
              totalBalance: 30,
              totalCapacity: 50,
              refillAt: "2026-05-20T00:00:00.000Z",
            },
            combined: {
              totalBalance: 1230,
              totalCapacity: 2050,
            },
          },
        }),
        { status: 200 }
      )
    );

    await expect(loadBillingUsage()).resolves.toEqual({
      plan: "core",
      chat: {
        totalBalance: 1200,
        totalCapacity: 2000,
        refillAt: "2026-05-20T00:00:00.000Z",
      },
      upload: {
        totalBalance: 30,
        totalCapacity: 50,
        refillAt: "2026-05-20T00:00:00.000Z",
      },
      combined: {
        totalBalance: 1230,
        totalCapacity: 2050,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/usage", {
      cache: "no-store",
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
});
