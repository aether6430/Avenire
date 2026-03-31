type ChatErrorType =
  | "NETWORK_ERROR"
  | "MODEL_ERROR"
  | "USAGE_LIMIT_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

const CHAT_ERROR_MESSAGES: Record<ChatErrorType, string> = {
  NETWORK_ERROR:
    "Unable to connect to the server. Please check your internet connection and try again.",
  MODEL_ERROR:
    "The AI model is currently experiencing issues. Please try again in a few moments.",
  USAGE_LIMIT_ERROR:
    "You've reached the chat usage limit. Please try again later.",
  VALIDATION_ERROR:
    "There was an issue with your request. Please check your input and try again.",
  UNKNOWN_ERROR:
    "Something went wrong. Please try again or contact support if the issue persists.",
};

export function categorizeChatError(error: Error): ChatErrorType {
  const message = error.message.toLowerCase();

  if (
    error.name === "NetworkError" ||
    error.name === "AbortError" ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("connection")
  ) {
    return "NETWORK_ERROR";
  }

  if (message.includes("model") || message.includes("ai")) {
    return "MODEL_ERROR";
  }

  if (
    message.includes("usage limit") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return "USAGE_LIMIT_ERROR";
  }

  if (message.includes("validation") || message.includes("invalid")) {
    return "VALIDATION_ERROR";
  }

  return "UNKNOWN_ERROR";
}

export function getChatErrorMessage(error: Error): string {
  return CHAT_ERROR_MESSAGES[categorizeChatError(error)];
}
