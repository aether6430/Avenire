import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { resolveWorkspaceSupportRouteError } from "./workspace-support-route-model";

export async function resolveWorkspaceSupportRouteContext(input: {
  workspaceUuid: string;
}) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const workspaceUuid = input.workspaceUuid.trim();
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      ok: true as const,
      user,
      workspaceUuid,
    };
  } catch (error) {
    const failure = resolveWorkspaceSupportRouteError(error, {
      fallback: "Unable to load workspace support context.",
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
