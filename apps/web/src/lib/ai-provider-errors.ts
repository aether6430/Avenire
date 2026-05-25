export function isAiProviderConfigurationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AI_LoadAPIKeyError" ||
    error.message.includes("API key is missing") ||
    error.message.includes("isn't configured in this environment")
  );
}
