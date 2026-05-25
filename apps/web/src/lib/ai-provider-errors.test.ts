import { describe, expect, it } from "vitest";
import { isAiProviderConfigurationError } from "@/lib/ai-provider-errors";

describe("ai provider errors", () => {
  it("detects missing provider-key failures", () => {
    const error = Object.assign(
      new Error(
        "Mistral API key is missing. Pass it using the 'apiKey' parameter."
      ),
      { name: "AI_LoadAPIKeyError" }
    );

    expect(isAiProviderConfigurationError(error)).toBe(true);
  });

  it("does not mark unrelated failures as provider configuration errors", () => {
    expect(
      isAiProviderConfigurationError(new Error("The network timed out"))
    ).toBe(false);
  });
});
