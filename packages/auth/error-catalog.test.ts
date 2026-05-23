import { describe, expect, it } from "vitest";
import {
  ERROR_CODES as ERROR_CODES_A,
  getErrorMessage as getErrorMessageA,
} from "./error_codes";
import {
  ERROR_CODES as ERROR_CODES_B,
  getErrorMessage as getErrorMessageB,
} from "./error_messages";
import { getBrowser, parseUserAgent } from "./parse-user-agent";
import {
  getWaitlistErrorDetails,
  WAITLIST_ERROR_NONE,
} from "./waitlist-shared";

describe("@avenire/auth error catalog", () => {
  it("keeps the duplicated maps and waitlist messages in sync", () => {
    expect(ERROR_CODES_A.size).toBeGreaterThan(10);
    expect(ERROR_CODES_A).toEqual(ERROR_CODES_B);
    expect(ERROR_CODES_A.get("WAITLIST_PENDING")).toEqual({
      email: [
        "This email is on the waitlist, but it has not been approved yet.",
      ],
    });
    expect(getErrorMessageA("USER_ALREADY_EXISTS")?.source).toBe("email");
    expect(
      getErrorMessageA("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.userMessage
    ).toBe("This is your last account, and it can't be unlinked.");
    expect(getErrorMessageA("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.source).toBe(
      "user"
    );
    expect(
      getErrorMessageA(WAITLIST_ERROR_NONE.toUpperCase())?.userMessage
    ).toBe("This email does not have access yet.");
    expect(getErrorMessageB("USER_ALREADY_EXISTS")?.source).toBe("email");
    expect(
      getErrorMessageB("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.userMessage
    ).toBe("This is your last account, and it can't be unlinked.");
    expect(getErrorMessageB("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.source).toBe(
      "user"
    );
    expect(getErrorMessageB(WAITLIST_ERROR_NONE.toUpperCase())?.source).toBe(
      "email"
    );
    expect(getErrorMessageB("WAITLIST_PENDING")?.source).toBe("email");
    expect(
      getErrorMessageA("ANYTHING", "not been approved yet")?.userMessage
    ).toBe("This email is on the waitlist, but it has not been approved yet.");
    expect(getErrorMessageB("UNKNOWN_CODE")?.source).toBe("server");
    expect(
      getWaitlistErrorDetails(" waitlist_not_found ")?.canJoinWaitlist
    ).toBe(true);
    expect(getWaitlistErrorDetails("WAITLIST_PENDING")?.canJoinWaitlist).toBe(
      false
    );
    expect(getWaitlistErrorDetails("other")).toBeNull();
  });

  it("parses browsers and summarized user-agent labels", () => {
    expect([
      "Chrome",
      "Firefox",
      "Safari",
      "Edge",
      "Opera",
      "Internet Explorer",
    ]).toEqual([
      getBrowser("Mozilla/5.0 Chrome/124.0"),
      getBrowser("Mozilla/5.0 Firefox/125.0"),
      getBrowser("Mozilla/5.0 Version/17.0 Safari/605.1.15"),
      getBrowser("Mozilla/5.0 Edg/124.0"),
      getBrowser("Mozilla/5.0 OPR/109.0"),
      getBrowser("Mozilla/4.0 MSIE 10.0"),
    ]);
    expect(getBrowser("UnknownAgent")).toBe("Unknown");
    expect(
      parseUserAgent(
        "Mozilla/5.0 (iPhone) AppleWebKit Safari/605.1.15 Mobile/15E148"
      )
    ).toBe("Safari on Mobile running iOS");
    expect(
      parseUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit Chrome/124.0 Safari/537.36"
      )
    ).toBe("Chrome on Desktop running Linux");
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Android 14; Tablet) AppleWebKit Firefox/125.0"
      )
    ).toBe("Firefox on Tablet running Android");
  });
});
