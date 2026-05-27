import { resolveApiErrorMessage } from "@/lib/api-error-message";

export function resolveAccountDeleteFailure(deleted: { id: string } | null) {
  if (deleted) {
    return null;
  }

  return {
    error: "Account not found",
    status: 404,
  };
}

export function buildAccountDeleteSuccessBody() {
  return {
    ok: true,
  };
}

export const ACCOUNT_DELETE_ERROR = "Unable to delete account.";

export function resolveAccountDeleteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}
