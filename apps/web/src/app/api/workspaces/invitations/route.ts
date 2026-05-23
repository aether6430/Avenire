import { NextResponse } from "next/server";
import { resolveWorkspaceDirectoryRouteError } from "../workspace-directory-route-model";
import { handleWorkspaceInvitationsRouteGet } from "./workspace-invitations-route-get";

export async function GET() {
  try {
    return await handleWorkspaceInvitationsRouteGet();
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
