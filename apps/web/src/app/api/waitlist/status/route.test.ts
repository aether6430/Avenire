import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWaitlistAccessStateByEmailMock,
  getWaitlistEntryByEmailMock,
  normalizeEmailMock,
} = vi.hoisted(() => ({
  getWaitlistAccessStateByEmailMock: vi.fn(),
  getWaitlistEntryByEmailMock: vi.fn(),
  normalizeEmailMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getWaitlistAccessStateByEmail: getWaitlistAccessStateByEmailMock,
  getWaitlistEntryByEmail: getWaitlistEntryByEmailMock,
  normalizeEmail: normalizeEmailMock,
}));

import { GET } from "./route";

describe("waitlist status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeEmailMock.mockImplementation((email: string) =>
      email.trim().toLowerCase()
    );
    getWaitlistAccessStateByEmailMock.mockResolvedValue("pending");
    getWaitlistEntryByEmailMock.mockResolvedValue({
      email: "person@example.com",
      status: "pending",
    });
  });

  it("fails closed to status none when no email is provided", async () => {
    const response = await GET(
      new Request("https://avenire.space/api/waitlist/status")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "none",
    });
    expect(normalizeEmailMock).not.toHaveBeenCalled();
    expect(getWaitlistAccessStateByEmailMock).not.toHaveBeenCalled();
    expect(getWaitlistEntryByEmailMock).not.toHaveBeenCalled();
  });

  it("normalizes the email and returns waitlist status with the stored entry", async () => {
    const response = await GET(
      new Request(
        "https://avenire.space/api/waitlist/status?email=%20Person%40Example.com%20"
      )
    );

    expect(normalizeEmailMock).toHaveBeenCalledWith("Person@Example.com");
    expect(getWaitlistAccessStateByEmailMock).toHaveBeenCalledWith(
      "person@example.com"
    );
    expect(getWaitlistEntryByEmailMock).toHaveBeenCalledWith(
      "person@example.com"
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "pending",
      waitlist: {
        email: "person@example.com",
        status: "pending",
      },
    });
  });

  it("fails open to status none when lookups throw", async () => {
    getWaitlistAccessStateByEmailMock.mockRejectedValueOnce(
      new Error("db offline")
    );
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request(
        "https://avenire.space/api/waitlist/status?email=person@example.com"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "none",
    });
    expect(logSpy).toHaveBeenCalledWith("[api/waitlist/status] failed", {
      error: expect.any(Error),
    });
    logSpy.mockRestore();
  });
});
