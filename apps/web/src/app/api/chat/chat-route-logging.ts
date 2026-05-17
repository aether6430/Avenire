const LOG_PREFIX = "[api/chat]";

function isChatProfileLoggingEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CHAT_PROFILE_LOGS?.trim().toLowerCase() === "true"
  );
}

function getProfileLogMeta() {
  if (!isChatProfileLoggingEnabled()) {
    return null;
  }

  return {
    profileAt: new Date().toISOString(),
    profileEpochMs: Date.now(),
    profileProcessMs: Math.round(performance.now() * 1000) / 1000,
  };
}

function withProfileLogMeta(meta?: Record<string, unknown>) {
  const profileMeta = getProfileLogMeta();
  if (!profileMeta) {
    return meta;
  }

  return {
    ...meta,
    ...profileMeta,
  };
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.info(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.info(`${LOG_PREFIX} ${message}`);
}

export function logError(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.error(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.error(`${LOG_PREFIX} ${message}`);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  const nextMeta = withProfileLogMeta(meta);
  if (nextMeta) {
    console.warn(`${LOG_PREFIX} ${message}`, nextMeta);
    return;
  }

  console.warn(`${LOG_PREFIX} ${message}`);
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    const maybeApiError = error as Error & {
      statusCode?: unknown;
      url?: unknown;
      responseBody?: unknown;
      lastError?: unknown;
      reason?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      reason: maybeApiError.reason,
      statusCode: maybeApiError.statusCode,
      url: maybeApiError.url,
      responseBody: maybeApiError.responseBody,
      lastError: maybeApiError.lastError
        ? formatError(maybeApiError.lastError)
        : undefined,
      stack: error.stack,
    };
  }
  return { message: "Unknown error", value: error };
}

export function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "ResponseAborted" ||
    error.message.toLowerCase().includes("aborted")
  );
}

export function isChatProviderConfigurationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AI_LoadAPIKeyError" ||
    error.message.includes("API key is missing") ||
    error.message.includes("isn't configured in this environment")
  );
}

export function getChatStreamErrorMessage(error: unknown) {
  const formatted = formatError(error);
  logError("Model stream failed", { error: formatted });

  if (isAbortLikeError(error)) {
    return "The chat request was stopped.";
  }

  if (isChatProviderConfigurationError(error)) {
    return "The selected AI model isn't configured in this environment. Please configure the AI provider and retry.";
  }

  return "The model provider failed while generating this response. Please retry in a moment.";
}
