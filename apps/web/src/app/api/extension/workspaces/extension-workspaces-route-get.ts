import { NextResponse } from "next/server";
import { listWorkspacesForUser } from "@/lib/file-data";
import { resolveExtensionRouteError } from "../extension-route-model";

export async function handleExtensionWorkspacesRouteGet(input: {
  userId: string;
}) {
  try {
    const workspaces = await listWorkspacesForUser(input.userId);
    return NextResponse.json({ workspaces });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension workspaces.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
