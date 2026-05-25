export const WAITLIST_EMAIL_REQUIRED_ERROR = "Email is required.";
export const WAITLIST_REQUEST_FAILED_ERROR =
  "Unable to add email to the waitlist.";

export function parseWaitlistRequestEmail(payload: unknown):
  | {
      success: true;
      email: string;
    }
  | {
      success: false;
      error: string;
    } {
  const email =
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { email?: unknown }).email === "string"
      ? (payload as { email: string }).email.trim()
      : "";

  if (!email) {
    return {
      success: false,
      error: WAITLIST_EMAIL_REQUIRED_ERROR,
    };
  }

  return {
    success: true,
    email,
  };
}

export function resolveWaitlistPublicEmailBaseUrl(baseUrl: string) {
  return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
    ? "https://avenire.space"
    : baseUrl;
}

export function resolveWaitlistRouteError(
  error: unknown,
  fallback = WAITLIST_REQUEST_FAILED_ERROR
) {
  return {
    error: error instanceof Error ? error.message : fallback,
    status: 500,
  };
}
