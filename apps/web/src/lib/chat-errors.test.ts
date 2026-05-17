import { describe, expect, it } from "vitest";
import { categorizeChatError, getChatErrorMessage } from "@/lib/chat-errors";

describe("chat errors", () => {
  it("categorizes network and model failures explicitly", () => {
    expect(
      categorizeChatError(new Error("network timeout while trying to fetch"))
    ).toBe("NETWORK_ERROR");
    expect(
      categorizeChatError(new Error("The AI model returned malformed output"))
    ).toBe("MODEL_ERROR");
  });

  it("categorizes usage-limit and validation failures explicitly", () => {
    expect(categorizeChatError(new Error("429 rate limit exceeded"))).toBe(
      "USAGE_LIMIT_ERROR"
    );
    expect(categorizeChatError(new Error("invalid request payload"))).toBe(
      "VALIDATION_ERROR"
    );
  });

  it("falls back to an unknown error message when no specific category matches", () => {
    const error = new Error("something strange happened");
    expect(categorizeChatError(error)).toBe("UNKNOWN_ERROR");
    expect(getChatErrorMessage(error)).toBe(
      "Something went wrong. Please try again or contact support if the issue persists."
    );
  });
});
