import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleBillingPortalPostMock,
  handleBillingUsageGetMock,
  handleWaitlistRequestPostMock,
} = vi.hoisted(() => ({
  handleBillingPortalPostMock: vi.fn(),
  handleBillingUsageGetMock: vi.fn(),
  handleWaitlistRequestPostMock: vi.fn(),
}));

vi.mock("./billing/portal/billing-portal-post", () => ({
  handleBillingPortalPost: handleBillingPortalPostMock,
}));

vi.mock("./billing/usage/billing-usage-get", () => ({
  handleBillingUsageGet: handleBillingUsageGetMock,
}));

vi.mock("./waitlist/request/waitlist-request-route-post", () => ({
  handleWaitlistRequestPost: handleWaitlistRequestPostMock,
}));

import { POST as postBillingPortal } from "./billing/portal/route";
import { GET as getBillingUsage } from "./billing/usage/route";
import { POST as postWaitlistRequest } from "./waitlist/request/route";

describe("public route wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleBillingPortalPostMock.mockResolvedValue(Response.json({ url: "ok" }));
    handleBillingUsageGetMock.mockResolvedValue(Response.json({ usage: {} }));
    handleWaitlistRequestPostMock.mockResolvedValue(
      Response.json({ status: "pending" })
    );
  });

  it("delegates billing and waitlist route wrappers to their dedicated handlers", async () => {
    const request = new Request("https://avenire.space");
    const portalResponse = await postBillingPortal(request);
    const usageResponse = await getBillingUsage();
    const waitlistResponse = await postWaitlistRequest(request);

    expect(handleBillingPortalPostMock).toHaveBeenCalledWith(request);
    expect(handleBillingUsageGetMock).toHaveBeenCalledWith();
    expect(handleWaitlistRequestPostMock).toHaveBeenCalledWith({ request });

    await expect(portalResponse.json()).resolves.toEqual({ url: "ok" });
    await expect(usageResponse.json()).resolves.toEqual({ usage: {} });
    await expect(waitlistResponse.json()).resolves.toEqual({
      status: "pending",
    });
  });
});
