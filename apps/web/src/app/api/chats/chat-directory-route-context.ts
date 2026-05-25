import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { resolveChatDirectoryRouteError } from "./chat-directory-route-model";

export async function resolveChatDirectoryRouteContext() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Workspace not found" },
          { status: 404 }
        ),
      };
    }

    return {
      ok: true as const,
      session,
      workspace,
    };
  } catch (error) {
    const failure = resolveChatDirectoryRouteError(error, {
      fallback: "Unable to load chats.",
    });
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: failure.error },
        { status: failure.status }
      ),
    };
  }
}
