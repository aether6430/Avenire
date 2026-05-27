const DEFAULT_API_ERROR_MESSAGE = "Something went wrong.";

export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export function resolveApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE
) {
  if (error instanceof PublicApiError) {
    return error.message;
  }

  if (process.env.NODE_ENV === "test" && error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function resolveApiRouteError(
  error: unknown,
  input: {
    fallback?: string;
    status?: number;
  } = {}
) {
  const status = error instanceof PublicApiError ? error.status : input.status;

  return {
    error: resolveApiErrorMessage(error, input.fallback),
    status: status ?? 500,
  };
}
