import { NextResponse } from "next/server";
import { listWorkspacesForUser } from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { resolveWorkspaceDirectoryRouteError } from "../workspace-directory-route-model";

export async function handleWorkspaceListRouteGet() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspaces = await listWorkspacesForUser(user.id);
    return NextResponse.json({ workspaces });
  } catch (error) {
    const failure = resolveWorkspaceDirectoryRouteError(error, {
      fallback: "Unable to load workspaces.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
