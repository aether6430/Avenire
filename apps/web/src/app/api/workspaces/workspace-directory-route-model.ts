import { resolveApiRouteError } from "@/lib/api-error-message";

export const WORKSPACE_INVITATION_INVALID_PAYLOAD_ERROR = "Invalid payload";

export function parseWorkspaceInvitationAction(
  payload: { action?: unknown },
  invitationId: string
):
  | {
      success: true;
      data: {
        action: "accept" | "decline";
        invitationId: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const normalizedAction =
    typeof payload.action === "string"
      ? payload.action.trim().toLowerCase()
      : "";
  const normalizedInvitationId = invitationId.trim();

  if (
    !(
      normalizedInvitationId &&
      (normalizedAction === "accept" || normalizedAction === "decline")
    )
  ) {
    return {
      success: false,
      error: WORKSPACE_INVITATION_INVALID_PAYLOAD_ERROR,
    };
  }

  return {
    success: true,
    data: {
      action: normalizedAction,
      invitationId: normalizedInvitationId,
    },
  };
}

export function resolveWorkspaceDirectoryRouteError(
  error: unknown,
  options: {
    fallback: string;
    status?: number;
  }
) {
  return resolveApiRouteError(error, options);
}
