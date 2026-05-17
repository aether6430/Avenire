import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestWaitlistEntryMock, renderWaitlistWelcomeEmailMock, sendMock } =
  vi.hoisted(() => ({
    renderWaitlistWelcomeEmailMock: vi.fn(),
    requestWaitlistEntryMock: vi.fn(),
    sendMock: vi.fn(),
  }));

vi.mock("@avenire/database", () => ({
  requestWaitlistEntry: requestWaitlistEntryMock,
}));

vi.mock("@avenire/emailer", () => ({
  Emailer: class {
    send = sendMock;
  },
  renderWaitlistWelcomeEmail: renderWaitlistWelcomeEmailMock,
}));

import { handleWaitlistRequestPost } from "./waitlist-request-route-post";

describe("waitlist request route post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestWaitlistEntryMock.mockResolvedValue({
      email: "person@example.com",
      status: "pending",
    });
    renderWaitlistWelcomeEmailMock.mockResolvedValue("<p>Welcome</p>");
    sendMock.mockResolvedValue(undefined);
  });

  it("fails closed for missing emails", async () => {
    const response = await handleWaitlistRequestPost({
      request: {
        json: vi.fn().mockResolvedValue({ email: "   " }),
      } as never,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Email is required.",
    });
    expect(requestWaitlistEntryMock).not.toHaveBeenCalled();
  });

  it("requests a waitlist entry and sends a welcome email for pending entries", async () => {
    const response = await handleWaitlistRequestPost({
      request: new Request("http://localhost:3000/api/waitlist/request", {
        body: JSON.stringify({
          email: "  person@example.com  ",
        }),
        method: "POST",
      }),
    });

    expect(requestWaitlistEntryMock).toHaveBeenCalledWith("person@example.com");
    expect(renderWaitlistWelcomeEmailMock).toHaveBeenCalledWith({
      email: "person@example.com",
      loginUrl: "https://avenire.space/waitlist",
    });
    expect(sendMock).toHaveBeenCalledWith({
      html: "<p>Welcome</p>",
      replyTo: "support@avenire.space",
      subject: "Welcome to the Avenire waitlist",
      to: ["person@example.com"],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "pending",
      waitlist: {
        email: "person@example.com",
        status: "pending",
      },
    });
  });

  it("skips welcome emails for non-pending entries and tolerates email delivery failures", async () => {
    requestWaitlistEntryMock.mockResolvedValueOnce({
      email: "approved@example.com",
      status: "active",
    });

    const activeResponse = await handleWaitlistRequestPost({
      request: new Request("https://avenire.space/api/waitlist/request", {
        body: JSON.stringify({
          email: "approved@example.com",
        }),
        method: "POST",
      }),
    });

    expect(sendMock).not.toHaveBeenCalled();
    await expect(activeResponse.json()).resolves.toEqual({
      status: "active",
      waitlist: {
        email: "approved@example.com",
        status: "active",
      },
    });

    requestWaitlistEntryMock.mockResolvedValueOnce({
      email: "pending@example.com",
      status: "pending",
    });
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const pendingResponse = await handleWaitlistRequestPost({
      request: new Request("https://avenire.space/api/waitlist/request", {
        body: JSON.stringify({
          email: "pending@example.com",
        }),
        method: "POST",
      }),
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[api/waitlist/request] failed to send welcome email",
      expect.objectContaining({
        email: "pending@example.com",
      })
    );
    expect(pendingResponse.status).toBe(200);
    await expect(pendingResponse.json()).resolves.toEqual({
      status: "pending",
      waitlist: {
        email: "pending@example.com",
        status: "pending",
      },
    });
    logSpy.mockRestore();
  });

  it("surfaces waitlist persistence failures through the route error mapper", async () => {
    requestWaitlistEntryMock.mockRejectedValueOnce(new Error("db offline"));

    const errorResponse = await handleWaitlistRequestPost({
      request: new Request("https://avenire.space/api/waitlist/request", {
        body: JSON.stringify({
          email: "person@example.com",
        }),
        method: "POST",
      }),
    });

    expect(errorResponse.status).toBe(500);
    await expect(errorResponse.json()).resolves.toEqual({
      error: "db offline",
    });
  });
});
