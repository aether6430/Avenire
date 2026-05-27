import { resolveApiErrorMessage } from "@/lib/api-error-message";

import { normalizeOrganizationMembers } from "../members/workspace-share-members-model";

export const WORKSPACE_SHARE_TEAM_ERROR =
  "Unable to share workspace with the team.";

export function buildWorkspaceTeamRecipients(input: {
  currentUserId: string;
  membersResult: unknown;
}) {
  return normalizeOrganizationMembers(input.membersResult)
    .map((member) => ({
      email: member.email,
      role: member.role,
      userId: member.userId,
    }))
    .filter(
      (
        member
      ): member is { email: string; role: string; userId: string | null } =>
        member.userId !== input.currentUserId &&
        typeof member.email === "string" &&
        member.email.trim().length > 0
    );
}

export function resolveWorkspaceShareTeamRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
