import { describe, expect, it } from "vitest";
import {
  resolveBillingAppBaseUrl,
  resolveCheckoutSelection,
  resolvePortalReturnPath,
} from "./billing-route-model";

describe("billing route model", () => {
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
  });
});
