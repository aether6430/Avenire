import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./error_codes";
import { getBrowser, parseUserAgent } from "./parse-user-agent";
import {
  getWaitlistErrorDetails,
  WAITLIST_ERROR_NONE,
} from "./waitlist-shared";

describe("@avenire/auth error catalog", () => {
  it("keeps a single auth error helper and the waitlist messages aligned", () => {
    expect(getErrorMessage("USER_ALREADY_EXISTS")?.source).toBe("email");
    expect(
      getErrorMessage("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.userMessage
    ).toBe("This is your last account, and it can't be unlinked.");
    expect(getErrorMessage("YOU_CANT_UNLINK_YOUR_LAST_ACCOUNT")?.source).toBe(
      "user"
    );
    expect(
      getErrorMessage(WAITLIST_ERROR_NONE.toUpperCase())?.userMessage
    ).toBe("This email does not have access yet.");
    expect(getErrorMessage(WAITLIST_ERROR_NONE.toUpperCase())?.source).toBe(
      "email"
    );
    expect(getErrorMessage("WAITLIST_PENDING")?.source).toBe("email");
    expect(
      getErrorMessage("ANYTHING", "not been approved yet")?.userMessage
    ).toBe("This email is on the waitlist, but it has not been approved yet.");
    expect(getErrorMessage("UNKNOWN_CODE")?.source).toBe("server");
    expect(
      getWaitlistErrorDetails(" waitlist_not_found ")?.canJoinWaitlist
    ).toBe(true);
    expect(getWaitlistErrorDetails("WAITLIST_PENDING")?.canJoinWaitlist).toBe(
      false
    );
    expect(getWaitlistErrorDetails("other")).toBeNull();
    expect(
      existsSync(resolve(import.meta.dirname, "./error_messages.ts"))
    ).toBe(false);
  });

  it("does not keep the removed error_messages surface in package exports", () => {
    const packageJson = readFileSync(
      resolve(import.meta.dirname, "./package.json"),
      "utf8"
    );

    expect(packageJson).not.toContain('"./error_messages"');
    expect(packageJson).toContain(
      '"build": "rm -rf dist && tsc -p tsconfig.dist.json"'
    );
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
