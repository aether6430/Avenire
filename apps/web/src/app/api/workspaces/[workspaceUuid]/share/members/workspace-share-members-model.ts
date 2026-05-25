import { z } from "zod";

export const workspaceShareInviteSchema = z.object({
  email: z.string().trim().min(1),
  role: z.enum(["admin", "member"]).optional(),
});

export const workspaceShareRemoveSchema = z.object({
  memberIdOrEmail: z.string().trim().min(1),
});

export const WORKSPACE_SHARE_MEMBERS_LIST_ERROR =
  "Unable to load workspace members.";
export const WORKSPACE_SHARE_MEMBERS_INVITE_ERROR = "Unable to add member.";
export const WORKSPACE_SHARE_MEMBERS_REMOVE_ERROR = "Unable to remove member.";

export function resolveInviteRole(role?: string) {
  return role === "admin" ? "admin" : "member";
}

export function resolveWorkspaceShareMembersRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}

export function buildWorkspaceShareUrl(input: {
  baseUrl: string;
  rootFolderId?: string | null;
  workspaceUuid: string;
}) {
  return input.rootFolderId
    ? `${input.baseUrl}/workspace/files/${input.workspaceUuid}/folder/${input.rootFolderId}`
    : `${input.baseUrl}/workspace/files`;
}

export function normalizeOrganizationMembers(membersResult: unknown): Array<{
  email: string | null;
  id: string | null;
  name: string | null;
  role: string;
  userId: string | null;
  avatar?: string | null;
}> {
  const members = (
    Array.isArray(membersResult)
      ? membersResult
      : ((membersResult as { members?: unknown[] } | null | undefined)
          ?.members ?? [])
  ) as Array<{
    id?: string | null;
    role?: string | null;
    userId?: string | null;
    user?: {
      id?: string | null;
      email?: string | null;
      image?: string | null;
      name?: string | null;
    } | null;
  }>;

  return members.map((member) => ({
    id: member.id ?? null,
    userId: member.userId ?? member.user?.id ?? null,
    email: member.user?.email ?? null,
    name: member.user?.name ?? null,
    avatar: member.user?.image ?? null,
    role: member.role ?? "member",
  }));
}

export function filterWorkspaceShareMembers(input: {
  members: Array<{
    email: string | null;
    id: string | null;
    name: string | null;
    role: string;
    userId: string | null;
    avatar?: string | null;
  }>;
  query: string;
}) {
  const normalizedQuery = input.query.trim().toLowerCase();
  if (!normalizedQuery) {
    return input.members;
  }

  return input.members.filter((member) =>
    [member.name ?? "", member.email ?? "", member.userId ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function canManageWorkspaceMembers(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}
