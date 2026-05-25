import { describe, expect, it } from "vitest";
import {
  getChatStreamErrorMessage,
  isChatProviderConfigurationError,
} from "./chat-route-logging";

describe("chat route logging helpers", () => {
  it("maps provider configuration failures to an explicit user-facing message", () => {
    const error = Object.assign(
      new Error(
        "Fireworks API key API key is missing. Pass it using the 'apiKey' parameter."
      ),
      { name: "AI_LoadAPIKeyError" }
    );

    expect(isChatProviderConfigurationError(error)).toBe(true);
    expect(getChatStreamErrorMessage(error)).toBe(
      "The selected AI model isn't configured in this environment. Please configure the AI provider and retry."
    );
  });
});
