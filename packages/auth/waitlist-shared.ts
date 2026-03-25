export const WAITLIST_ERROR_NONE = "waitlist_not_found";
export const WAITLIST_ERROR_PENDING = "waitlist_pending";

function getWaitlistErrorMessage(error: typeof WAITLIST_ERROR_NONE | typeof WAITLIST_ERROR_PENDING) {
  return error === WAITLIST_ERROR_PENDING
    ? "This email is on the waitlist, but it has not been approved yet."
    : "This email does not have access yet.";
}

export function getWaitlistErrorDetails(error: string | null | undefined) {
  const normalizedError = error?.trim().toLowerCase();

  if (normalizedError === WAITLIST_ERROR_NONE) {
    return {
      code: WAITLIST_ERROR_NONE,
      message: getWaitlistErrorMessage(WAITLIST_ERROR_NONE),
      canJoinWaitlist: true,
    };
  }

  if (normalizedError === WAITLIST_ERROR_PENDING) {
    return {
      code: WAITLIST_ERROR_PENDING,
      message: getWaitlistErrorMessage(WAITLIST_ERROR_PENDING),
      canJoinWaitlist: false,
    };
  }

  return null;
}
