import { NextResponse } from "next/server";
import { listPendingInvitationsForEmail } from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { resolveWorkspaceDirectoryRouteError } from "../workspace-directory-route-model";

export async function handleWorkspaceInvitationsRouteGet() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await listPendingInvitationsForEmail(sessionUser.email);
    return NextResponse.json({ invitations });
  } catch (error) {
    const failure = resolveWorkspaceDirectoryRouteError(error, {
      fallback: "Unable to load invitations.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
