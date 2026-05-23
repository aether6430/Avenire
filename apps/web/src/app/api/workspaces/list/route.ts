import { NextResponse } from "next/server";
import { resolveWorkspaceDirectoryRouteError } from "../workspace-directory-route-model";
import { handleWorkspaceListRouteGet } from "./workspace-list-route-get";

export async function GET() {
  try {
    return await handleWorkspaceListRouteGet();
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
