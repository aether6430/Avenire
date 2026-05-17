import { describe, expect, it } from "vitest";
import {
  parseWaitlistRequestEmail,
  resolveWaitlistPublicEmailBaseUrl,
  resolveWaitlistRouteError,
  WAITLIST_EMAIL_REQUIRED_ERROR,
  WAITLIST_REQUEST_FAILED_ERROR,
} from "./waitlist-route-model";

describe("waitlist route model", () => {
  it("trims waitlist emails and fails closed for missing values", () => {
    expect(
      parseWaitlistRequestEmail({ email: "  person@example.com  " })
    ).toEqual({
      email: "person@example.com",
      success: true,
    });
    expect(parseWaitlistRequestEmail({ email: "   " })).toEqual({
      error: WAITLIST_EMAIL_REQUIRED_ERROR,
      success: false,
    });
    expect(parseWaitlistRequestEmail({ email: 42 })).toEqual({
      error: WAITLIST_EMAIL_REQUIRED_ERROR,
      success: false,
    });
  });

  it("normalizes localhost email links and resolves route errors", () => {
    expect(resolveWaitlistPublicEmailBaseUrl("http://localhost:3000")).toBe(
      "https://avenire.space"
    );
    expect(resolveWaitlistPublicEmailBaseUrl("https://app.avenire.space")).toBe(
      "https://app.avenire.space"
    );

    expect(resolveWaitlistRouteError(new Error("db offline"))).toEqual({
      error: "db offline",
      status: 500,
    });
    expect(resolveWaitlistRouteError("boom")).toEqual({
      error: WAITLIST_REQUEST_FAILED_ERROR,
      status: 500,
    });
  });
});
