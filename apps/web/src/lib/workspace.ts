import { auth } from "@avenire/auth/server";
import {
  resolveWorkspaceForUser,
  userCanAccessWorkspace,
} from "@/lib/file-data";
import { headers } from "next/headers";

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function getWorkspaceContextForUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;

  const workspace = await resolveWorkspaceForUser(session.user.id, activeOrganizationId);
  if (!workspace) {
    return null;
  }

  return {
    user: session.user,
    workspace,
  };
}

export async function ensureWorkspaceAccessForUser(userId: string, workspaceId: string) {
  return userCanAccessWorkspace(userId, workspaceId);
}
