import { describe, expect, it } from "vitest";
import {
  buildChatShareUrl,
  parseChatShareGrantBody,
} from "./chat-share-route-model";

describe("chat share route model", () => {
  it("builds the canonical public chat share URL", () => {
    expect(buildChatShareUrl("https://avenire.app", "token-123")).toBe(
      "https://avenire.app/share/token-123"
    );
  });

  it("trims grant emails and fails closed for missing values", () => {
    expect(
      parseChatShareGrantBody({ email: "  person@example.com  " })
    ).toEqual({
      email: "person@example.com",
    });
    expect(parseChatShareGrantBody({ email: "   " })).toEqual({
      email: null,
    });
    expect(parseChatShareGrantBody({ email: 42 })).toEqual({
      email: null,
    });
  });
});
